
import { runExecutor } from '@/lib/execution';
import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { scriptContent, inputValues } = await request.json();

    if (!scriptContent || typeof scriptContent !== 'string') {
      return new Response(JSON.stringify({ error: 'scriptContent is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const stream = new ReadableStream({
      async start(controller) {
        await runExecutor(scriptContent, inputValues || {}, controller);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    const err = e as Error;
    return new Response(JSON.stringify({ error: 'Invalid request body', detail: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}
