
const GCLOUD_RUNNER_URL = 'https://gcloud-runner-532743504408.us-central1.run.app/';

export async function runExecutor(
    scriptContent: string,
    inputValues: Record<string, string>,
    controller: ReadableStreamDefaultController<any>
) {
    console.log('--- GCloud Commander: Delegating Script Execution to gcloud-runner ---');
    console.log('Input Values:', inputValues);

    const sendData = (data: object) => {
        try {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'));
        } catch (e) {
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
    };

    // Construct the script:
    // 1. Prepend `export` statements for each input variable.
    const variableExports = Object.entries(inputValues)
        .map(([key, value]) => `export ${key}='${value.replace(/'/g, "'\\''")}'`) // Safely escape single quotes
        .join('\n');

    // 2. Remove the 'read -p' lines from the original script content.
    const scriptBody = scriptContent
        .split('\n')
        .filter(line => !line.trim().startsWith('read -p'))
        .join('\n');
    
    const executableScript = `${variableExports}\n\n${scriptBody}`;
    
    console.log('--- Executable Script to be sent to runner ---\n', executableScript);

    try {
        const response = await fetch(GCLOUD_RUNNER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: executableScript })
        });

        const fullLog = await response.text();

        if (!response.ok) {
            throw new Error(`gcloud-runner service failed with status ${response.status}: ${fullLog}`);
        }

        console.log('--- Full Log from gcloud-runner ---\n', fullLog);

        // Parse the full output into steps based on the '---STEP:' delimiter
        const lines = fullLog.split('\n');
        const steps = [];
        let currentStep = {
            title: 'Initializing Execution...',
            log: '',
        };

        for (const line of lines) {
            if (line.startsWith('---STEP:')) {
                // If the previous step has content, push it to the array.
                if (currentStep.log.trim() || currentStep.title !== 'Initializing Execution...') {
                     steps.push({ ...currentStep, log: currentStep.log.trim() });
                }
                const newTitle = line.replace('---STEP:', '').trim();
                currentStep = {
                    title: newTitle,
                    log: '',
                };
            } else {
                currentStep.log += line + '\n';
            }
        }
        // Add the last step to the array
        if (currentStep.log.trim() || (steps.length === 0 && currentStep.title !== 'Initializing Execution...')) {
            steps.push({ ...currentStep, log: currentStep.log.trim() });
        }

        // Stream the parsed steps back to the client to maintain the UI experience
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            sendData({ type: 'step', data: { id: i, title: step.title, log: step.log } });
        }

        sendData({ type: 'end' });

    } catch (error) {
        console.error('--- GCloud Commander: Error calling gcloud-runner ---', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        sendData({ type: 'error', data: { message } });
    } finally {
        closeController();
    }
}
