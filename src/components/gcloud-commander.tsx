
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
} from 'lucide-react';
import { getSummaryForScriptLog, getScripts, saveScript, deleteScript, type Script } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatePresence, motion } from 'framer-motion';

interface Variable {
  prompt: string;
  name: string;
}

interface ExecutionStep {
  id: number;
  title: string;
  status: 'running' | 'success' | 'error' | 'pending';
  log: string;
  summary?: string;
  summaryLoading: boolean;
}

const parseVariables = (scriptContent: string): Variable[] => {
  if (!scriptContent) return [];
  const variableRegex = /read -p "([^"]+): " ([A-Z_0-9]+)/g;
  const matches = [...scriptContent.matchAll(variableRegex)];
  return matches.map((match) => ({
    prompt: match[1],
    name: match[2],
  }));
};

export default function GCloudCommander() {
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptKey, setSelectedScriptKey] = useState<string>('');
  const [isLoadingScripts, setIsLoadingScripts] = useState(true);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const selectedScript = useMemo(() => {
    return scripts.find(s => s.key === selectedScriptKey);
  }, [scripts, selectedScriptKey]);


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
        const parsedVars = parseVariables(selectedScript.content);
        setVariables(parsedVars);
        setInputValues({});
        setSteps([]);
        setExpandedLogs(new Set());
      } else {
        setVariables([]);
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

  const handleExecute = async () => {
    if (!selectedScript?.content) return;
    setIsExecuting(true);
    setSteps([]);
    setExpandedLogs(new Set());
  
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptContent: selectedScript.content,
          inputValues: inputValues,
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
        buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line
  
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
            return; // Stop processing
          } else if (type === 'end') {
            setIsExecuting(false);
            return; // Stop processing
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
            <div className="space-y-2">
            <Label htmlFor="script-select">Select a script to run</Label>
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

        {selectedScript && (variables.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {variables.map((variable) => (
              <div key={variable.name} className="space-y-2">
                <Label htmlFor={variable.name}>{variable.prompt}</Label>
                <Input
                  id={variable.name}
                  value={inputValues[variable.name] || ''}
                  onChange={(e) => handleInputChange(variable.name, e.target.value)}
                  placeholder={`Enter value for ${variable.name}`}
                  disabled={isExecuting}
                />
              </div>
            ))}
          </div>
        ) : selectedScriptKey && !isLoadingScripts && (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                This script does not require any inputs.
            </div>
        ))}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-6">
        <Button
          onClick={handleExecute}
          disabled={isExecuting || !selectedScriptKey || isLoadingScripts}
          className="w-full font-bold text-lg py-6"
        >
          {isExecuting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <PlayCircle className="mr-2 h-5 w-5" />
          )}
          {isExecuting ? 'Executing...' : 'Execute Script'}
        </Button>
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
    </>
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
