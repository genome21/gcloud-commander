'use server';

/**
 * @fileOverview Summarizes the output of a gcloud script execution using generative AI.
 *
 * - summarizeScriptExecution - A function that handles the summarization process.
 * - SummarizeScriptExecutionInput - The input type for the summarizeScriptExecution function.
 * - SummarizeScriptExecutionOutput - The return type for the summarizeScriptExecution function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeScriptExecutionInputSchema = z.object({
  scriptOutput: z
    .string()
    .describe('The output log from the gcloud script execution.'),
});
export type SummarizeScriptExecutionInput = z.infer<
  typeof SummarizeScriptExecutionInputSchema
>;

const SummarizeScriptExecutionOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the key events and outcomes from the script execution.'
    ),
});
export type SummarizeScriptExecutionOutput = z.infer<
  typeof SummarizeScriptExecutionOutputSchema
>;

export async function summarizeScriptExecution(
  input: SummarizeScriptExecutionInput
): Promise<SummarizeScriptExecutionOutput> {
  return summarizeScriptExecutionFlow(input);
}

const summarizeScriptExecutionPrompt = ai.definePrompt({
  name: 'summarizeScriptExecutionPrompt',
  input: {schema: SummarizeScriptExecutionInputSchema},
  output: {schema: SummarizeScriptExecutionOutputSchema},
  prompt: `You are an expert system administrator summarizing gcloud script execution logs.

  Your goal is to provide a concise summary of the key events and outcomes from the provided script output.
  Omit less important or irrelevant details and focus on the most important steps and results.

  Script Output:
  {{scriptOutput}}`,
});

const summarizeScriptExecutionFlow = ai.defineFlow(
  {
    name: 'summarizeScriptExecutionFlow',
    inputSchema: SummarizeScriptExecutionInputSchema,
    outputSchema: SummarizeScriptExecutionOutputSchema,
  },
  async input => {
    const {output} = await summarizeScriptExecutionPrompt(input);
    return output!;
  }
);
