'use server';

import { summarizeScriptExecution } from '@/ai/flows/summarize-script-execution';

export async function getSummaryForScriptLog(log: string): Promise<string> {
  if (!log || typeof log !== 'string' || log.trim().length === 0) {
    return 'Log content was empty. No summary could be generated.';
  }

  try {
    const result = await summarizeScriptExecution({ scriptOutput: log });
    return result.summary;
  } catch (error) {
    console.error('Error getting summary from GenAI flow:', error);
    return 'An error occurred while generating the summary for this step.';
  }
}
