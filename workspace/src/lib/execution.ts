
const GCLOUD_RUNNER_URL = 'https://gcloud-runner-532743504408.us-central1.run.app/';

export async function runExecutor(
    scriptContent: string,
    inputValues: Record<string, string>,
    controller: ReadableStreamDefaultController<any>
) {
    console.log('--- GCloud Commander: Orchestrating Script Execution via gcloud-runner ---');
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
    
    const fullScriptPrefix = `${variableExports}\n`;
    
    // Parse script into executable commands, handling multi-line commands ending with '\'
    const lines = scriptBody.split('\n');
    const commands = [];
    let currentCommand = '';

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '') continue;

        currentCommand += trimmedLine;
        if (trimmedLine.endsWith('\\')) {
            currentCommand = currentCommand.slice(0, -1) + ' '; // remove trailing \ and add space for next line
        } else {
            commands.push(currentCommand);
            currentCommand = '';
        }
    }
    if (currentCommand) {
        commands.push(currentCommand.trim());
    }

    let stepId = 0;
    let currentStepTitle = 'Initializing Execution...';
    let currentStepLog = '';

    const completeAndSendStep = () => {
        if (currentStepLog.trim() || currentStepTitle !== 'Initializing Execution...') {
            sendData({ type: 'step', data: { id: stepId, title: currentStepTitle, log: currentStepLog.trim() } });
            stepId++;
            currentStepLog = ''; // Reset log for next step
        }
    };

    try {
        for (const command of commands) {
            if (command.startsWith('echo "---STEP:')) {
                completeAndSendStep();
                const newTitle = command.match(/echo "---STEP:([^"]+)"/)?.[1];
                currentStepTitle = newTitle || 'Untitled Step';
                // Add a marker to the log for transparency
                currentStepLog += `$ ${command}\n--- STEP: ${currentStepTitle} ---\n`;
            } else {
                currentStepLog += `$ ${command}\n`; // Show the command being executed in the log

                // Prepend exports to every command to ensure environment variables are available in the stateless runner
                const commandWithExports = `${fullScriptPrefix}\n${command}`;

                const runnerResponse = await fetch(GCLOUD_RUNNER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: commandWithExports })
                });
                
                const result = await runnerResponse.json();

                if (result.stdout) {
                    currentStepLog += result.stdout + '\n';
                }
                if (result.stderr) {
                    currentStepLog += `[STDERR] ${result.stderr}\n`;
                }

                if (!runnerResponse.ok || result.returncode !== 0) {
                     const errorOutput = result.stderr || result.stdout || 'No output from runner.';
                     throw new Error(`Command failed with exit code ${result.returncode}:\n${errorOutput}`);
                }
            }
        }
        
        completeAndSendStep(); // Send the last step
        sendData({ type: 'end' });

    } catch (error) {
        console.error('--- GCloud Commander: Error during script orchestration ---', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        currentStepLog += `\n--- EXECUTION FAILED ---\n${message}\n`;
        completeAndSendStep();
        sendData({ type: 'error', data: { message: `Execution failed at step: "${currentStepTitle}"` } });
    } finally {
        closeController();
    }
}
