import { spawn } from 'child_process';

export function runExecutor(
    scriptContent: string,
    inputValues: Record<string, string>,
    controller: ReadableStreamDefaultController<any>
) {
    const sendData = (data: object) => {
        try {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'));
        } catch (e) {
            // Suppress errors from writing to a closed controller
            console.warn("Could not write to stream, controller likely closed.");
        }
    };
    
    let isClosed = false;
    const closeController = () => {
        if (!isClosed) {
            isClosed = true;
            controller.close();
        }
    }

    const env = { ...process.env, ...inputValues };
    const executableScript = scriptContent
        .split('\n')
        .filter(line => !line.trim().startsWith('read -p'))
        .join('\n');

    const child = spawn('bash', ['-c', executableScript], { env });

    let stepIdCounter = 0;
    let currentStep = {
        id: stepIdCounter,
        title: 'Initializing Execution...',
        log: '',
    };

    const emitCurrentStep = () => {
        if (currentStep.log.trim() || currentStep.title !== 'Next Step...') {
            sendData({ type: 'step', data: { ...currentStep, log: currentStep.log.trim() } });
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
        if (isClosed) return;
        sendData({ type: 'error', data: { message: error.message } });
        closeController();
    });

    child.on('close', (code) => {
        if (isClosed) return; // Already handled by an error event
        emitCurrentStep();
        if (code !== 0) {
            sendData({ type: 'error', data: { message: `Script exited with code ${code}.` } });
        }
        sendData({ type: 'end' });
        closeController();
    });
}
