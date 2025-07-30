
const GCLOUD_RUNNER_URL = process.env.NEXT_PUBLIC_GCLOUD_RUNNER_URL || 'https://gcloud-runner-532743504408.us-central1.run.app/';

export async function runExecutor(
    scriptContent: string,
    inputValues: Record<string, string>,
    detectedFlags: Record<string, string>,
    controller: ReadableStreamDefaultController<any>
) {
    console.log('--- GCloud Commander: Orchestrating Script Execution ---');
    console.log('Input Variables:', inputValues);
    console.log('Detected Flags:', detectedFlags);

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

    // 1. Prepare the script
    const scriptBody = scriptContent
        .split('\n')
        .filter(line => 
            !line.trim().startsWith('read -p') && 
            !line.trim().startsWith('#!/bin/bash')
        )
        .join('\n');
    
    // 2. Parse into commands, handling multi-line commands
    const lines = scriptBody.split('\n');
    const commands: string[] = [];
    let currentCommand = '';

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '') continue;

        currentCommand += trimmedLine;
        if (trimmedLine.endsWith('\\')) {
            currentCommand = currentCommand.slice(0, -1) + ' '; 
        } else {
            commands.push(currentCommand);
            currentCommand = '';
        }
    }
    if (currentCommand) {
        commands.push(currentCommand.trim());
    }

    // 3. Orchestrate execution
    let stepId = 0;
    let currentStepTitle = 'Initializing Execution...';
    let currentStepLog = '';

    const completeAndSendStep = () => {
        if (currentStepLog.trim() || currentStepTitle !== 'Initializing Execution...') {
            sendData({ type: 'step', data: { id: stepId, title: currentStepTitle, log: currentStepLog.trim() } });
            stepId++;
            currentStepLog = ''; 
        }
    };

    try {
        for (const rawCommand of commands) {
            const stepMatch = rawCommand.match(/echo "---STEP:([^"]+)"/);
            const sleepMatch = rawCommand.match(/^sleep (\d+)/);
            const echoMatch = rawCommand.match(/^echo (.*)/);

            if (stepMatch) {
                // Handle step delimiter
                completeAndSendStep();
                currentStepTitle = stepMatch[1] || 'Untitled Step';
            } else if (rawCommand.trim().startsWith('gcloud')) {
                // Delegate to gcloud-runner, substituting variables first.
                let hydratedCommand = rawCommand;

                // A. Substitute script variables (e.g., $VAR_NAME)
                for (const [key, value] of Object.entries(inputValues)) {
                    const regex = new RegExp(`\\$${key}|\\$\\{${key}\\}`, 'g');
                    hydratedCommand = hydratedCommand.replace(regex, value || '');
                }

                // B. Substitute detected flags (e.g., --zone=VALUE)
                for (const [key, value] of Object.entries(detectedFlags)) {
                    const regex = new RegExp(`--${key}(?:=|\\s+)[^\\s"']+`, 'g');
                    if (hydratedCommand.match(regex)) {
                        hydratedCommand = hydratedCommand.replace(regex, `--${key}=${value}`);
                    }
                }
                
                const runnerResponse = await fetch(GCLOUD_RUNNER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: hydratedCommand })
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
            } else if (sleepMatch) {
                // Handle sleep locally
                const duration = parseInt(sleepMatch[1], 10);
                currentStepLog += `Sleeping for ${duration} seconds...\n`;
                await new Promise(resolve => setTimeout(resolve, duration * 1000));
                currentStepLog += `Sleep complete.\n`;
            } else if (echoMatch) {
                 let output = echoMatch[1];
                 // Naive quote removal
                 if ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith("'") && output.endsWith("'"))) {
                    output = output.substring(1, output.length - 1);
                 }
                 currentStepLog += `${output}\n`;
            } else {
                // For other non-executable commands, we do nothing to keep the log clean.
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
