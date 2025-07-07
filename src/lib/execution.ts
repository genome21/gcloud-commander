
import { spawn } from 'child_process';

export function runExecutor(
    scriptContent: string,
    inputValues: Record<string, string>,
    controller: ReadableStreamDefaultController<any>
) {
    console.log('--- GCloud Commander: Starting Script Execution ---');
    console.log('Input Values:', inputValues);

    const sendData = (data: object) => {
        try {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'));
        } catch (e) {
            // Suppress errors from writing to a closed controller
            console.warn("GCloud Commander: Could not write to stream, controller likely closed.");
        }
    };
    
    let isClosed = false;
    const closeController = () => {
        if (!isClosed) {
            isClosed = true;
            try {
                controller.close();
            } catch (e) {
                // Suppress error from closing an already closed controller
            }
        }
    }

    const env = { ...process.env, ...inputValues };
    const executableScript = scriptContent
        .split('\n')
        .filter(line => !line.trim().startsWith('read -p'))
        .join('\n');
    
    console.log('Executable Script:\n', executableScript);

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
        // Log the raw output to the server console for debugging in Cloud Run
        console.log('Script output:', output.trim());

        const lines = output.split('\n');
        for (const line of lines) {
            if (!line) continue;
            if (line.startsWith('---STEP:')) {
                emitCurrentStep();
                const newTitle = line.replace('---STEP:', '').trim();
                console.log(`GCloud Commander: --- New Step Detected: ${newTitle} ---`);
                currentStep.title = newTitle;
            } else {
                currentStep.log += line + '\n';
            }
        }
    };

    child.stdout.on('data', processData);
    child.stderr.on('data', processData);

    child.on('error', (error) => {
        console.error('--- GCloud Commander: Script Execution Error ---', error.message);
        if (isClosed) return;
        sendData({ type: 'error', data: { message: error.message } });
        closeController();
    });

    child.on('close', (code) => {
        console.log(`--- GCloud Commander: Script Execution Finished with exit code ${code} ---`);
        if (isClosed) return; // Already handled by an error event
        emitCurrentStep();
        if (code !== 0) {
            sendData({ type: 'error', data: { message: `Script exited with code ${code}.` } });
        }
        sendData({ type: 'end' });
        closeController();
    });
}
