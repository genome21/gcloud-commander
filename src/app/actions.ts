
'use server';

import { summarizeScriptExecution } from '@/ai/flows/summarize-script-execution';
import fs from 'fs/promises';
import path from 'path';

export interface Script {
  key: string;
  name: string;
  description: string;
  content: string;
}

export interface ScriptMetadata {
    key: string;
    name: string;
    description: string;
}

const scriptsDir = path.join(process.cwd(), 'scripts');

async function ensureScriptsDirExists() {
  try {
    await fs.access(scriptsDir);
  } catch (error) {
    await fs.mkdir(scriptsDir, { recursive: true });
  }
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export async function getScripts(): Promise<Script[]> {
  await ensureScriptsDirExists();
  const files = await fs.readdir(scriptsDir);
  const scripts: Script[] = [];

  for (const file of files) {
    if (path.extname(file) === '.json') {
      try {
        const key = path.basename(file, '.json');
        const fileContent = await fs.readFile(path.join(scriptsDir, file), 'utf-8');
        const data = JSON.parse(fileContent);

        if (typeof data.name === 'string' && typeof data.description === 'string' && typeof data.script === 'string') {
            scripts.push({
              key: key,
              name: data.name,
              description: data.description,
              content: data.script,
            });
        }
      } catch (error) {
        console.error(`Error processing script file ${file}:`, error);
      }
    }
  }
  return scripts.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveScript(
  key: string | null,
  name: string,
  description: string,
  content: string
): Promise<ScriptMetadata> {
  await ensureScriptsDirExists();
  const newKey = key || slugify(name);
  if (!newKey) {
    throw new Error("Could not generate a valid key for the script.");
  }

  // If it's a rename, delete the old file
  if (key && key !== newKey) {
      await deleteScript(key);
  }
  
  const scriptData = { name, description, script: content };
  const scriptPath = path.join(scriptsDir, `${newKey}.json`);

  await fs.writeFile(scriptPath, JSON.stringify(scriptData, null, 2));
  
  return { key: newKey, name, description };
}

export async function deleteScript(key: string): Promise<void> {
    const scriptPath = path.join(scriptsDir, `${key}.json`);
    
    try {
        await fs.unlink(scriptPath);
    } catch(error) {
        console.error(`Error deleting script ${key}:`, error);
        // We can ignore errors if files don't exist
    }
}


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
