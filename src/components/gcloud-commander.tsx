
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  Loader2,
  PlayCircle,
  Sparkles,
  TerminalSquare,
  XCircle,
  Settings,
  PlusCircle,
  Trash2,
  Pencil,
  FileText,
  Network,
  Info,
  Cpu,
  FileSearch,
} from 'lucide-react';
import { getSummaryForScriptLog, getScripts, saveScript, deleteScript, getProjectInfo, getMachineTypes, type Script, type ProjectInfo, type MachineTypeInfo } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScriptFlowDiagram } from './script-flow-diagram';

interface ScriptParameter {
  name: string; // e.g., GCLOUD_PROJECT or zone
  label: string; // e.g., "GCP Project ID" or "Zone"
  defaultValue: string; // Default value from script, if any
  isFlag: boolean; // true if it's a --flag, false if it's a read -p variable
  from: 'readp' | 'flag';
}

interface ExecutionStep {
  id: number;
  title: string;
  status: 'running' | 'success' | 'error' | 'pending';
  log: string;
  summary?: string;
  summaryLoading: boolean;
}

const titleCase = (str: string) => {
    return str.replace(/-/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const parseParameters = (scriptContent: string): ScriptParameter[] => {
  if (!scriptContent) return [];
  const params = new Map<string, ScriptParameter>();

  // 1. Detect gcloud flags first to get default values
  const flagRegex = /--([a-zA-Z0-9_-]+)(?:=|\s+)([^\s"']+)/g;
  const flagMatches = [...scriptContent.matchAll(flagRegex)];
  
  for (const match of flagMatches) {
    const name = match[1];
    const value = match[2];
    // Don't add if it's a variable substitution
    if (value.startsWith('$')) continue;

    if (!params.has(name)) {
        params.set(name, {
            name: name,
            label: titleCase(name),
            defaultValue: value,
            isFlag: true,
            from: 'flag',
        });
    }
  }

  // 2. Detect `read -p` variables. These take precedence for labels.
  const variableRegex = /read -p "([^"]+): " ([A-Z_0-9]+)/g;
  const varMatches = [...scriptContent.matchAll(variableRegex)];
  
  for (const match of varMatches) {
    const label = match[1];
    const name = match[2];
    const existing = params.get(name.toLowerCase());
    if (existing) {
        // A flag for this variable exists, just update the label
        existing.label = label;
        existing.from = 'readp';
        existing.isFlag = false;
    } else {
        params.set(name, {
            name: name,
            label: label,
            defaultValue: '',
            isFlag: false,
            from: 'readp',
        });
    }
  }
  
  return Array.from(params.values());
};

export default function GCloudCommander() {
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptKey, setSelectedScriptKey] = useState<string>('');
  const [isLoadingScripts, setIsLoadingScripts] = useState(true);
  const [parameters, setParameters] = useState<ScriptParameter[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  // State for Project Info Dialog
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  
  // State for Machine Types Dialog
  const [machineTypes, setMachineTypes] = useState<MachineTypeInfo[]>([]);
  const [isMachineTypeDialogOpen, setIsMachineTypeDialogOpen] = useState(false);
  const [isFetchingMachineTypes, setIsFetchingMachineTypes] = useState(false);
  
  // State for script preview
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const selectedScript = useMemo(() => {
    return scripts.find(s => s.key === selectedScriptKey);
  }, [scripts, selectedScriptKey]);

  const previewScriptContent = useMemo(() => {
    if (!selectedScript) return '';

    const readPInputs = Object.fromEntries(parameters.filter(p => p.from === 'readp').map(p => [p.name, inputValues[p.name] ?? p.defaultValue]));
    const flagInputs = Object.fromEntries(parameters.filter(p => p.from === 'flag').map(p => [p.name, inputValues[p.name] ?? p.defaultValue]));

    const scriptLines = selectedScript.content
      .split('\n')
      .filter(line => !line.trim().startsWith('read -p') && !line.trim().startsWith('#!/bin/bash'));

    const hydratedLines = scriptLines.map(line => {
      let hydratedLine = line;

      for (const [key, value] of Object.entries(readPInputs)) {
          const regex = new RegExp(`\\$${key}|\\$\\{${key}\\}`, 'g');
          hydratedLine = hydratedLine.replace(regex, value || '');
      }
      
      for (const [key, value] of Object.entries(flagInputs)) {
          const regex = new RegExp(`--${key}(?:=|\\s+)[^\\s"']+`, 'g');
          if (hydratedLine.match(regex)) {
              hydratedLine = hydratedLine.replace(regex, `--${key}=${value}`);
          }
      }
      return hydratedLine;
    });
    
    return hydratedLines.join('\n');
  }, [selectedScript, parameters, inputValues]);


  const fetchScripts = useCallback(async () => {
    setIsLoadingScripts(true);
    try {
      const fetchedScripts = await getScripts();
      setScripts(fetchedScripts);
      if (fetchedScripts.length > 0 && !scripts.some(s => s.key === selectedScriptKey)) {
        setSelectedScriptKey(fetchedScripts[0].key);
      } else if (fetchedScripts.length === 0) {
        setSelectedScriptKey('');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load scripts.' });
    } finally {
        setIsLoadingScripts(false);
    }
  }, [toast, selectedScriptKey, scripts]);

  useEffect(() => {
    fetchScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
      if (selectedScript) {
        const parsedParams = parseParameters(selectedScript.content);
        setParameters(parsedParams);
        
        const initialValues: Record<string, string> = {};
        for(const param of parsedParams) {
            initialValues[param.name] = param.defaultValue;
        }
        setInputValues(initialValues);

        setSteps([]);
        setExpandedLogs(new Set());
      } else {
        setParameters([]);
        setSteps([]);
        setExpandedLogs(new Set());
      }
  }, [selectedScript]);


  const handleScriptChange = (key: string) => {
    if (isExecuting) return;
    setSelectedScriptKey(key);
  };

  const handleInputChange = (name: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleFetchProjectInfo = async () => {
    const projectId = inputValues['GCLOUD_PROJECT'] || inputValues['project'];
    if (!projectId) {
      toast({ variant: 'destructive', title: 'Missing Project ID', description: 'Please enter a GCP Project ID first.' });
      return;
    }

    setIsFetchingInfo(true);
    setIsInfoDialogOpen(true);
    setProjectInfo(null);

    try {
      const info = await getProjectInfo(projectId);
      setProjectInfo(info);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Error Fetching Info', description: message });
      setIsInfoDialogOpen(false); // Close dialog on error
    } finally {
      setIsFetchingInfo(false);
    }
  };
  
  const handleFetchMachineTypes = async () => {
    const projectId = inputValues['GCLOUD_PROJECT'] || inputValues['project'];
    const zoneParam = parameters.find(p => p.name.toLowerCase().includes('zone'));
    const zone = zoneParam ? inputValues[zoneParam.name] : '';

    if (!projectId || !zone) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide both a Project ID and a Zone to fetch machine types.' });
      return;
    }

    setIsFetchingMachineTypes(true);
    setIsMachineTypeDialogOpen(true);
    setMachineTypes([]);

    try {
      const types = await getMachineTypes(projectId, zone);
      setMachineTypes(types);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Error Fetching Machine Types', description: message });
      setIsMachineTypeDialogOpen(false);
    } finally {
      setIsFetchingMachineTypes(false);
    }
  };

  const handleInfoSelect = (type: 'region' | 'zone' | 'network' | 'subnet', value: string) => {
    const targetParam = parameters.find(p => p.name.toLowerCase().includes(type));
    
    if (targetParam) {
        handleInputChange(targetParam.name, value);
        toast({
            title: `Input Updated`,
            description: `${targetParam.label} has been set to "${value}".`
        });
        setIsInfoDialogOpen(false);
    } else {
        toast({
            variant: 'destructive',
            title: 'No Matching Input',
            description: `Your script does not seem to have an input field for a ${type}.`
        });
    }
  };

  const handleMachineTypeSelect = (machineTypeName: string) => {
    const targetParam = parameters.find(p => p.name.toLowerCase().includes('machine-type'));
    if (targetParam) {
        handleInputChange(targetParam.name, machineTypeName);
        toast({
            title: `Input Updated`,
            description: `${targetParam.label} has been set to "${machineTypeName}".`
        });
        setIsMachineTypeDialogOpen(false);
    }
  };


  const handleExecute = async () => {
    if (!selectedScript?.content) return;
    setIsExecuting(true);
    setSteps([]);
    setExpandedLogs(new Set());

    const variables: Record<string, string> = {};
    const detectedFlags: Record<string, string> = {};

    for (const param of parameters) {
        if (param.isFlag) {
            detectedFlags[param.name] = inputValues[param.name];
        } else {
            variables[param.name] = inputValues[param.name];
        }
    }
  
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptContent: selectedScript.content,
          inputValues: variables,
          detectedFlags: detectedFlags,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred during execution.' }));
        throw new Error(errorData.message || 'Execution failed');
      }
  
      if (!response.body) {
        throw new Error('Response body is missing');
      }
  
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
  
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
  
        for (const line of lines) {
          if (line.trim() === '') continue;
          const { type, data } = JSON.parse(line);
  
          if (type === 'step') {
            const step = data;
            setSteps((prevSteps) => [
              ...prevSteps,
              { ...step, status: 'running', summaryLoading: true },
            ]);
  
            getSummaryForScriptLog(step.log)
              .then(summary => {
                setSteps((prevSteps) =>
                  prevSteps.map((s) =>
                    s.id === step.id
                      ? { ...s, status: 'success', summary, summaryLoading: false }
                      : s
                  )
                );
              })
              .catch(() => {
                setSteps((prevSteps) =>
                  prevSteps.map((s) =>
                    s.id === step.id
                      ? { ...s, status: 'error', summary: 'Failed to get summary.', summaryLoading: false }
                      : s
                  )
                );
              });
          } else if (type === 'error') {
            toast({
              variant: 'destructive',
              title: 'Execution Error',
              description: data.message,
            });
            setIsExecuting(false);
            return;
          } else if (type === 'end') {
            setIsExecuting(false);
            return;
          }
        }
      }
      setIsExecuting(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown network error occurred';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      setIsExecuting(false);
    }
  };

  const onScriptsChanged = (newKey?: string) => {
      setIsLoadingScripts(true);
      getScripts().then((newScripts) => {
          setScripts(newScripts);
          if (newKey) {
              setSelectedScriptKey(newKey);
          } else if (selectedScriptKey && !newScripts.some(s => s.key === selectedScriptKey)) {
              setSelectedScriptKey(newScripts[0]?.key || '');
          }
      }).catch(() => {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to reload scripts.' });
      }).finally(() => {
          setIsLoadingScripts(false);
      });
  }

  const toggleLogExpansion = useCallback((id: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const StatusIcon = ({ status }: { status: ExecutionStep['status'] }) => {
    const iconMap = {
      running: <Loader2 className="h-5 w-5 animate-spin text-accent" />,
      success: <CheckCircle2 className="h-5 w-5 text-primary" />,
      error: <XCircle className="h-5 w-5 text-destructive" />,
      pending: <div className="h-5 w-5 rounded-full bg-muted" />,
    };
    return (
      <div className="flex h-6 w-6 items-center justify-center">
        {iconMap[status]}
      </div>
    );
  };
  
  const readPParams = useMemo(() => parameters.filter(p => p.from === 'readp'), [parameters]);
  const flagParams = useMemo(() => parameters.filter(p => p.from === 'flag'), [parameters]);
  
  const zoneParamName = useMemo(() => parameters.find(p => p.name.toLowerCase().includes('zone'))?.name, [parameters]);
  const zoneValue = zoneParamName ? inputValues[zoneParamName] : undefined;


  return (
    <>
    <Card className="w-full max-w-4xl shadow-2xl shadow-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <TerminalSquare className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle className="font-headline text-2xl tracking-wider">
                    GCloud Commander
                    </CardTitle>
                    <CardDescription>
                    A professional frontend for your gcloud scripts.
                    </CardDescription>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsManaging(true)}>
                <Settings className="h-5 w-5" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoadingScripts ? (
            <div className="space-y-4 pt-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : scripts.length > 0 ? (
            <div className="rounded-lg border p-4 space-y-2">
            <Label htmlFor="script-select" className="font-semibold">Select a script to run</Label>
            <Select
                value={selectedScriptKey}
                onValueChange={handleScriptChange}
                disabled={isExecuting}
                name="script-select"
            >
                <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a script..." />
                </SelectTrigger>
                <SelectContent>
                {scripts.map((script) => (
                    <SelectItem key={script.key} value={script.key}>
                    {script.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            {selectedScript && (
                <p className="text-sm text-muted-foreground pt-1">{selectedScript.description}</p>
            )}
            </div>
        ) : (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                No scripts found. Click the settings icon to add a new script.
            </div>
        )}

        {selectedScript && parameters.length > 0 && (
            <div className="space-y-6">
                {readPParams.length > 0 && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {readPParams.map((param) => <ParameterInput key={param.name} parameter={param} value={inputValues[param.name]} onValueChange={handleInputChange} onFetchInfo={handleFetchProjectInfo} onFetchMachineTypes={handleFetchMachineTypes} isExecuting={isExecuting} projectId={inputValues['GCLOUD_PROJECT']} zone={zoneValue} />)}
                    </div>
                )}
               
                {flagParams.length > 0 && (
                     <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="hover:no-underline">
                                 <div className="flex items-center gap-2">
                                     <Info className="h-4 w-4 text-muted-foreground" />
                                     <h3 className="text-sm font-medium text-muted-foreground">Detected Parameters</h3>
                                 </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t mt-4">
                                    {flagParams.map((param) => <ParameterInput key={param.name} parameter={param} value={inputValues[param.name]} onValueChange={handleInputChange} onFetchInfo={handleFetchProjectInfo} onFetchMachineTypes={handleFetchMachineTypes} isExecuting={isExecuting} projectId={inputValues['GCLOUD_PROJECT']} zone={zoneValue} />)}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </div>
        )}

        {selectedScript && parameters.length === 0 && !isLoadingScripts && (
             <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                This script does not require any inputs.
            </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-6">
        <div className="flex w-full items-stretch gap-4">
          <Button
            onClick={handleExecute}
            disabled={isExecuting || !selectedScriptKey || isLoadingScripts}
            className="w-full font-bold text-lg py-6 flex-grow"
          >
            {isExecuting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-5 w-5" />
            )}
            {isExecuting ? 'Executing...' : 'Execute Script'}
          </Button>
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="lg"
                        className="px-4"
                        onClick={() => setIsPreviewDialogOpen(true)}
                        disabled={isExecuting || !selectedScriptKey || isLoadingScripts}
                    >
                        <FileSearch className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Preview Script</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {steps.length > 0 && (
          <div className="w-full space-y-4">
             <Separator />
            <AnimatePresence>
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <StatusIcon status={step.status} />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium font-headline">{step.title}</p>
                    {step.summaryLoading ? (
                      <div className="space-y-2 pt-1">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      step.summary && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                              <div className="flex items-center gap-2 font-medium text-primary">
                                <Sparkles className="h-4 w-4" />
                                <span>AI Summary</span>
                              </div>
                              <p className="mt-1 text-foreground/80">
                                {step.summary}
                              </p>
                            </motion.div>

                            <div className="flex justify-start pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleLogExpansion(step.id)}
                                    className="text-muted-foreground"
                                >
                                    <FileText className="mr-2 h-3 w-3" />
                                    {expandedLogs.has(step.id) ? 'Hide Raw Output' : 'View Raw Output'}
                                </Button>
                            </div>

                            <AnimatePresence>
                                {expandedLogs.has(step.id) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <pre className="text-xs mt-2 p-4 bg-muted rounded-md whitespace-pre-wrap font-mono text-muted-foreground">
                                    <code>{step.log}</code>
                                    </pre>
                                </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                      )
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardFooter>
    </Card>
    <ScriptManagerDialog open={isManaging} onOpenChange={setIsManaging} onScriptsChanged={onScriptsChanged} />
    <ProjectInfoDialog
      open={isInfoDialogOpen}
      onOpenChange={setIsInfoDialogOpen}
      isLoading={isFetchingInfo}
      info={projectInfo}
      onSelect={handleInfoSelect}
    />
    <MachineTypeDialog
        open={isMachineTypeDialogOpen}
        onOpenChange={setIsMachineTypeDialogOpen}
        isLoading={isFetchingMachineTypes}
        machineTypes={machineTypes}
        onSelect={handleMachineTypeSelect}
    />
    <ScriptPreviewDialog
      open={isPreviewDialogOpen}
      onOpenChange={setIsPreviewDialogOpen}
      scriptContent={previewScriptContent}
    />
    </>
  );
}

function ParameterInput({ parameter, value, onValueChange, onFetchInfo, onFetchMachineTypes, isExecuting, projectId, zone }: {
  parameter: ScriptParameter;
  value: string;
  onValueChange: (name: string, value: string) => void;
  onFetchInfo: () => void;
  onFetchMachineTypes: () => void;
  isExecuting: boolean;
  projectId?: string;
  zone?: string;
}) {
    const isProjectInfoField = ['zone', 'region', 'network', 'subnet', 'project'].some(keyword =>
        parameter.name.toLowerCase().includes(keyword)
    );
    const isMachineTypeField = parameter.name.toLowerCase().includes('machine-type');

    return (
        <div key={parameter.name} className="space-y-2">
        <Label htmlFor={parameter.name}>{parameter.label}</Label>
        <div className="flex items-center gap-2">
            <Input
            id={parameter.name}
            value={value || ''}
            onChange={(e) => onValueChange(parameter.name, e.target.value)}
            placeholder={parameter.defaultValue || `Enter value for ${parameter.name}`}
            disabled={isExecuting}
            className="flex-grow"
            />
            {isProjectInfoField && !parameter.name.toLowerCase().includes('project') && (
            <TooltipProvider>
                <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onFetchInfo}
                    disabled={isExecuting || (!projectId && !parameter.name.toLowerCase().includes('project'))}
                    className="shrink-0"
                    >
                    <Network className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Fetch Project Infrastructure Info</p>
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            )}
            {isMachineTypeField && (
              <TooltipProvider>
                <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={onFetchMachineTypes}
                    disabled={isExecuting || !projectId || !zone}
                    className="shrink-0"
                    >
                    <Cpu className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Fetch available machine types for the selected zone</p>
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            )}
        </div>
        </div>
    );
}


function ScriptManagerDialog({ open, onOpenChange, onScriptsChanged }: { open: boolean, onOpenChange: (open: boolean) => void, onScriptsChanged: (newKey?: string) => void}) {
    const { toast } = useToast();
    const [scripts, setScripts] = useState<Script[]>([]);
    const [editingScript, setEditingScript] = useState<Partial<Script> | null>(null);
    
    useEffect(() => {
        if (open && !editingScript) {
            getScripts().then(setScripts).catch(() => {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load scripts.' });
            });
        }
    }, [open, editingScript, toast]);

    const handleAddNew = () => {
        setEditingScript({ key: '', name: '', description: '', content: '#!/bin/bash\\n\\necho "---STEP:New Script"\\necho "Hello World!"' });
    };

    const handleEdit = (script: Script) => {
        setEditingScript(script);
    };

    const handleDelete = async (key: string) => {
        try {
            await deleteScript(key);
            toast({ title: 'Success', description: 'Script deleted.' });
            const newScripts = scripts.filter(s => s.key !== key);
            setScripts(newScripts);
            onScriptsChanged();
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete script.' });
        }
    };

    const handleSave = async () => {
        if (!editingScript || !editingScript.name) {
            toast({ variant: 'destructive', title: 'Error', description: 'Script name is required.' });
            return;
        }

        try {
            const savedScript = await saveScript(editingScript.key || null, editingScript.name, editingScript.description || '', editingScript.content || '');
            toast({ title: 'Success', description: `Script "${savedScript.name}" saved.` });
            setEditingScript(null);
            onScriptsChanged(savedScript.key);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast({ variant: 'destructive', title: 'Error', description: `Failed to save script: ${message}` });
        }
    };

    if (editingScript) {
        return (
            <Dialog open={!!editingScript} onOpenChange={(isOpen) => { if (!isOpen) setEditingScript(null); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingScript.key ? 'Edit Script' : 'Add New Script'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={editingScript.name} onChange={e => setEditingScript(s => s ? {...s, name: e.target.value} : null)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Input id="description" value={editingScript.description} onChange={e => setEditingScript(s => s ? {...s, description: e.target.value} : null)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="content" className="text-right pt-2">Script</Label>
                            <Textarea id="content" value={editingScript.content} onChange={e => setEditingScript(s => s ? {...s, content: e.target.value} : null)} className="col-span-3 min-h-[250px] font-mono" placeholder='#!/bin/bash ...' />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingScript(null)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Script</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Manage Scripts</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <div className="flex justify-end mb-4">
                        <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Script</Button>
                    </div>
                    <ScrollArea className="h-[400px] border rounded-md">
                        <div className="p-4 space-y-2">
                           {scripts.length > 0 ? scripts.map(script => (
                                <div key={script.key} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div>
                                        <p className="font-medium">{script.name}</p>
                                        <p className="text-sm text-muted-foreground">{script.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(script)}><Pencil className="h-4 w-4" /></Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the "{script.name}" script. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(script.key)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-muted-foreground py-16">No scripts yet.</div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ProjectInfoDialog({
  open,
  onOpenChange,
  info,
  isLoading,
  onSelect,
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  info: ProjectInfo | null,
  isLoading: boolean,
  onSelect: (type: 'region' | 'zone' | 'network' | 'subnet', value: string) => void,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Project Infrastructure Details</DialogTitle>
          <DialogDescription>
            Select an item to populate the corresponding input field.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden relative">
          {isLoading ? (
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-10 w-full" />
              </div>
               <div className="space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <Tabs defaultValue="regions" className="h-full flex flex-col">
              <TabsList className="shrink-0">
                <TabsTrigger value="regions">Regions &amp; Zones</TabsTrigger>
                <TabsTrigger value="networks">Networks &amp; Subnets</TabsTrigger>
              </TabsList>
              <ScrollArea className="flex-grow mt-2 pr-4">
                <TabsContent value="regions">
                  <Accordion type="single" collapsible className="w-full">
                    {info?.regions.map((region) => (
                      <AccordionItem value={region.name} key={region.name}>
                        <AccordionTrigger>{region.name}</AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col items-start gap-3 pl-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelect('region', region.name)}
                              className="font-medium"
                            >
                              Select Region: {region.name}
                            </Button>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
                              {region.zones.map((zone) => (
                                <Button
                                  key={zone}
                                  variant="outline"
                                  size="sm"
                                  className="p-2 font-mono text-xs justify-start"
                                  onClick={() => onSelect('zone', zone)}
                                >
                                  {zone}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
                <TabsContent value="networks">
                  <Accordion type="single" collapsible className="w-full">
                    {info?.networks.map((network) => (
                      <AccordionItem value={network.name} key={network.name}>
                        <AccordionTrigger>
                          <div className="flex flex-col items-start text-left">
                              <p>{network.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {network.ipv4Range}
                              </p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col items-start gap-3 pl-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelect('network', network.name)}
                              className="font-medium"
                            >
                              Select Network: {network.name}
                            </Button>

                            {network.subnetworks.length > 0 ? (
                              <div className="flex flex-col gap-2 w-full">
                                {network.subnetworks.map((subnet) => (
                                   <Button
                                    key={subnet.name}
                                    variant="outline"
                                    onClick={() => onSelect('subnet', subnet.name)}
                                    className="h-auto text-left justify-start"
                                  >
                                    <div className="flex flex-col items-start">
                                      <p className="font-medium text-sm text-foreground">{subnet.name}</p>
                                      <p className="text-sm text-muted-foreground font-mono">{subnet.range}</p>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground pt-2">No custom subnetworks found.</p>
                            )}
                           </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MachineTypeDialog({
  open,
  onOpenChange,
  machineTypes,
  isLoading,
  onSelect,
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  machineTypes: MachineTypeInfo[],
  isLoading: boolean,
  onSelect: (name: string) => void,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Available Machine Types</DialogTitle>
          <DialogDescription>
            Select a machine type to populate the input field. Types are specific to the selected zone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden relative">
          <ScrollArea className="h-full pr-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {machineTypes.map(type => (
                        <Button
                            key={type.name}
                            variant="outline"
                            onClick={() => onSelect(type.name)}
                            className="h-auto text-left justify-start"
                        >
                            <div className="flex flex-col items-start">
                                <p className="font-medium text-sm text-foreground">{type.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {type.guestCpus} vCPUs, {type.memoryMb / 1024} GB RAM - {type.description}
                                </p>
                            </div>
                        </Button>
                    ))}
                </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ScriptPreviewDialog({
  open,
  onOpenChange,
  scriptContent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scriptContent: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Script Execution Preview</DialogTitle>
          <DialogDescription>
            Preview the script that will be executed, either as raw text or a visual flow.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow my-4 overflow-hidden">
           <Tabs defaultValue="visual" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="visual">Visual Flow</TabsTrigger>
                <TabsTrigger value="text">Text Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="visual" className="flex-grow mt-4">
                <ScriptFlowDiagram scriptContent={scriptContent} />
              </TabsContent>
              <TabsContent value="text" className="flex-grow relative mt-4">
                <ScrollArea className="absolute inset-0">
                    <pre className="text-xs p-4 bg-muted rounded-md whitespace-pre-wrap font-mono text-muted-foreground">
                        <code>{scriptContent}</code>
                    </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
