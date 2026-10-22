'use server';

import { ai } from '@/lib/ai';

export async function testAiConnection(providerName: string) {
  const start = Date.now();
  try {
    const res = await ai.chat({
      messages: [{ role: 'user', content: 'Ping! Reply with exactly "Pong".' }],
      taskType: 'platformHelpBot' // just an arbitrary allowed task
    });
    const latency = Date.now() - start;
    return { success: true, latency, response: res };
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' };
  }
}
