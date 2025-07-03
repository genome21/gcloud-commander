
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
        const jsonPath = path.join(scriptsDir, file);
        
        const jsonFileContent = await fs.readFile(jsonPath, 'utf-8');
        const data = JSON.parse(jsonFileContent);

        if (typeof data.name === 'string' && typeof data.description === 'string' && typeof data.script === 'string') {
            const scriptPath = path.join(scriptsDir, data.script);
            const scriptFileContent = await fs.readFile(scriptPath, 'utf-8').catch(() => {
              console.warn(`Script file not found for key: ${key}. Assuming empty content.`);
              return '';
            });

            scripts.push({
              key: key,
              name: data.name,
              description: data.description,
              content: scriptFileContent,
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

  // If it's a rename, delete the old files
  if (key && key !== newKey) {
      await deleteScript(key);
  }
  
  const scriptFilename = `${newKey}.sh`;
  const scriptMetadata = { name, description, script: scriptFilename };
  const jsonPath = path.join(scriptsDir, `${newKey}.json`);
  const scriptPath = path.join(scriptsDir, scriptFilename);

  await fs.writeFile(jsonPath, JSON.stringify(scriptMetadata, null, 2));
  await fs.writeFile(scriptPath, content);
  
  return { key: newKey, name, description };
}

export async function deleteScript(key: string): Promise<void> {
    const jsonPath = path.join(scriptsDir, `${key}.json`);
    const scriptPath = path.join(scriptsDir, `${key}.sh`);
    
    try {
        await fs.unlink(jsonPath);
    } catch(error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`Error deleting script metadata ${key}:`, error);
        }
    }
    try {
        await fs.unlink(scriptPath);
    } catch(error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`Error deleting script file ${key}:`, error);
        }
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
