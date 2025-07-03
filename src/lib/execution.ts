import { spawn } from 'child_process';

type Step = {
  id: number;
  title: string;
  log: string;
};

type Events = {
  step: (step: Step) => void;
  error: (error: Error) => void;
  end: () => void;
};

// A very simple event emitter
class EventEmitter {
  private listeners: Partial<Events> = {};

  on<K extends keyof Events>(event: K, listener: Events[K]) {
    this.listeners[event] = listener;
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) {
    // @ts-ignore
    this.listeners[event]?.(...args);
  }
}

export class Executor extends EventEmitter {
  private scriptContent: string;
  private inputValues: Record<string, string>;

  constructor(scriptContent: string, inputValues: Record<string, string>) {
    super();
    this.scriptContent = scriptContent;
    this.inputValues = inputValues;
  }

  run() {
    const env = { ...process.env, ...this.inputValues };
    const child = spawn('bash', ['-c', this.scriptContent], { env });

    let stepIdCounter = 0;
    let currentStep = {
      id: stepIdCounter,
      title: 'Initializing Execution...',
      log: '',
    };

    const emitCurrentStep = () => {
      if (currentStep.log.trim() || currentStep.title !== 'Next Step...') {
        this.emit('step', { ...currentStep, log: currentStep.log.trim() });
        stepIdCounter++;
        currentStep = {
          id: stepIdCounter,
          title: 'Next Step...',
          log: '',
        };
      }
    };

    const processData = (data: Buffer) => {
      const output = data.toString();
      const lines = output.split('\n');

      for (const line of lines) {
         if (!line) continue;
        if (line.startsWith('---STEP:')) {
          emitCurrentStep();
          currentStep.title = line.replace('---STEP:', '').trim();
        } else {
          currentStep.log += line + '\n';
        }
      }
    };
    
    child.stdout.on('data', processData);
    child.stderr.on('data', processData);

    child.on('error', (error) => {
      this.emit('error', error);
    });

    child.on('close', (code) => {
      emitCurrentStep();
      if (code !== 0) {
        this.emit('error', new Error(`Script exited with code ${code}.`));
      }
      this.emit('end');
    });
  }
}
