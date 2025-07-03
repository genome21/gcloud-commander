'use server';

import { summarizeScriptExecution } from '@/ai/flows/summarize-script-execution';
import fs from 'fs/promises';
import path from 'path';

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

export async function getScripts(): Promise<ScriptMetadata[]> {
  await ensureScriptsDirExists();
  const files = await fs.readdir(scriptsDir);
  const scriptMetadata: ScriptMetadata[] = [];

  for (const file of files) {
    if (path.extname(file) === '.json') {
      try {
        const key = path.basename(file, '.json');
        const content = await fs.readFile(path.join(scriptsDir, file), 'utf-8');
        const data = JSON.parse(content);
        scriptMetadata.push({
          key: key,
          name: data.name,
          description: data.description,
        });
      } catch (error) {
        console.error(`Error processing script metadata for ${file}:`, error);
      }
    }
  }
  return scriptMetadata.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getScriptContent(key: string): Promise<string> {
  const scriptPath = path.join(scriptsDir, `${key}.sh`);
  try {
    return await fs.readFile(scriptPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading script content for ${key}:`, error);
    throw new Error('Script content not found.');
  }
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
  
  const metadata = { name, description };
  const metadataPath = path.join(scriptsDir, `${newKey}.json`);
  const scriptPath = path.join(scriptsDir, `${newKey}.sh`);

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  await fs.writeFile(scriptPath, content);
  
  return { key: newKey, name, description };
}

export async function deleteScript(key: string): Promise<void> {
    const metadataPath = path.join(scriptsDir, `${key}.json`);
    const scriptPath = path.join(scriptsDir, `${key}.sh`);
    
    try {
        await fs.unlink(metadataPath);
        await fs.unlink(scriptPath);
    } catch(error) {
        console.error(`Error deleting script ${key}:`, error);
        // We can ignore errors if files don't exist, e.g. partial deletion
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
