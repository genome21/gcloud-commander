'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  PlayCircle,
  Sparkles,
  TerminalSquare,
  XCircle,
} from 'lucide-react';
import { getSummaryForScriptLog } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { MockExecutor } from '@/lib/execution';
import { SCRIPTS, type Script } from '@/lib/scripts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  const variableRegex = /read -p "([^"]+): " ([A-Z_0-9]+)/g;
  const matches = [...scriptContent.matchAll(variableRegex)];
  return matches.map((match) => ({
    prompt: match[1],
    name: match[2],
  }));
};

export default function GCloudCommander() {
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Record<string, Script>>({});
  const [selectedScriptKey, setSelectedScriptKey] = useState<string>('');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    setScripts(SCRIPTS);
    const firstScriptKey = Object.keys(SCRIPTS)[0];
    if (firstScriptKey) {
      handleScriptChange(firstScriptKey);
    }
  }, []);

  const selectedScript = useMemo(() => {
    return scripts[selectedScriptKey];
  }, [scripts, selectedScriptKey]);

  const handleScriptChange = (key: string) => {
    if (isExecuting) return;
    setSelectedScriptKey(key);
    const script = scripts[key];
    if (script) {
      const parsedVars = parseVariables(script.content);
      setVariables(parsedVars);
      setInputValues({});
      setSteps([]);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleExecute = async () => {
    if (!selectedScript) return;
    setIsExecuting(true);
    setSteps([]);

    const executor = new MockExecutor(selectedScript.content, inputValues);

    executor.on('step', async (step) => {
      setSteps((prevSteps) => [
        ...prevSteps,
        { ...step, status: 'running', summaryLoading: true },
      ]);

      try {
        const summary = await getSummaryForScriptLog(step.log);
        setSteps((prevSteps) =>
          prevSteps.map((s) =>
            s.id === step.id
              ? { ...s, status: 'success', summary, summaryLoading: false }
              : s
          )
        );
      } catch (e) {
        setSteps((prevSteps) =>
          prevSteps.map((s) =>
            s.id === step.id
              ? { ...s, status: 'error', summary: 'Failed to get summary.', summaryLoading: false }
              : s
          )
        );
      }
    });

    executor.on('error', (error) => {
      toast({
        variant: 'destructive',
        title: 'Execution Error',
        description: error.message,
      });
      setIsExecuting(false);
    });

    executor.on('end', () => {
      setIsExecuting(false);
    });

    executor.run();
  };

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
    <Card className="w-full max-w-4xl shadow-2xl shadow-primary/10">
      <CardHeader>
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
      </CardHeader>
      <CardContent className="space-y-6">
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
              {Object.entries(scripts).map(([key, script]) => (
                <SelectItem key={key} value={key}>
                  {script.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedScript && (
            <p className="text-sm text-muted-foreground pt-1">{selectedScript.description}</p>
          )}
        </div>

        {variables.length > 0 && (
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
        )}
        
        {selectedScript && variables.length === 0 && (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                This script does not require any inputs.
            </div>
        )}

      </CardContent>
      <CardFooter className="flex-col items-stretch gap-6">
        <Button
          onClick={handleExecute}
          disabled={isExecuting}
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
                  <div className="flex-1 space-y-2">
                    <p className="font-medium font-headline">{step.title}</p>
                    {step.summaryLoading ? (
                      <div className="space-y-2 pt-1">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      step.summary && (
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
  );
}
