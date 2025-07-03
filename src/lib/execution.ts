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

export class MockExecutor extends EventEmitter {
  private scriptContent: string;
  private inputValues: Record<string, string>;

  constructor(scriptContent: string, inputValues: Record<string, string>) {
    super();
    this.scriptContent = scriptContent;
    this.inputValues = inputValues;
  }

  async run() {
    const steps: Omit<Step, 'id'>[] = [];

    if (this.scriptContent.includes('gcloud compute instances create')) {
      const projectName = this.inputValues['GCLOUD_PROJECT'] || 'test-project';
      const vmName = this.inputValues['VM_NAME'] || 'test-vm';
      const zone = this.inputValues['ZONE'] || 'us-central1-a';
      
      steps.push({ title: 'Setting Project', log: `Updated property [core/project] to [${projectName}].` });
      steps.push({ title: 'Creating VM Instance', log: `Creating instance [${vmName}] in [${zone}]...done.\nMachine type: e2-medium\nImage project: debian-cloud\nImage family: debian-11\nCreated [https://www.googleapis.com/compute/v1/projects/${projectName}/zones/${zone}/instances/${vmName}].` });
      steps.push({ title: 'Verifying Status', log: `NAME: ${vmName} ZONE: ${zone} MACHINE_TYPE: e2-medium PREEMPTIBLE: false INTERNAL_IP: 10.128.0.1 EXTERNAL_IP: 34.67.123.45 STATUS: RUNNING` });

    } else if (this.scriptContent.includes('gcloud storage ls')) {
       const projectName = this.inputValues['GCLOUD_PROJECT'] || 'test-project';
       steps.push({ title: 'Setting Project', log: `Updated property [core/project] to [${projectName}].` });
       steps.push({ title: 'Listing Buckets', log: `Listing all buckets in project ${projectName}:\ngs://test-project-alpha-bucket/\ngs://test-project-media-assets/\ngs://test-project-backup-storage/`});
    
    } else if (this.scriptContent.includes('gcloud functions deploy')) {
      const projectName = this.inputValues['GCLOUD_PROJECT'] || 'test-project';
      const functionName = this.inputValues['FUNCTION_NAME'] || 'my-test-function';
      const region = this.inputValues['REGION'] || 'us-central1';
      
      steps.push({ title: 'Setting Project', log: `Updated property [core/project] to [${projectName}].` });
      steps.push({ title: 'Deploying Function', log: `Deploying function [${functionName}] in project [${projectName}] region [${region}]...done.` });
      steps.push({ title: 'Verifying Deployment', log: `https:/\/${region}-${projectName}.cloudfunctions.net/${functionName}` });

    } else {
      steps.push({ title: 'Running Script', log: `This is a simple test script.\nIt doesn't require any user input.`});
      steps.push({ title: 'Finishing up', log: 'Script finished.'});
    }

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
      this.emit('step', { id: i, ...steps[i] });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    this.emit('end');
  }
}
