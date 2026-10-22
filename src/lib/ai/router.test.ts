import { ProviderRouter } from './index';
import { AiProvider, ChatOptions, AiError, TaskType } from './types';
import { env } from '../env';
import { prisma } from '../prisma';

// Mocks
class MockFailingOllama implements AiProvider {
  name = 'ollama';
  public failCount = 0;
  async chat(opts: any): Promise<string> { this.failCount++; throw new AiError('Ollama down', this.name, true); }
  async chatStream(opts: any, onChunk: any): Promise<void> { throw new AiError('Ollama down', this.name, true); }
  async embed(text: string): Promise<number[]> { throw new AiError('Ollama down', this.name, true); }
  async generateJSON<T>(prompt: string, schema: any, taskType: TaskType): Promise<T> { throw new AiError('Ollama JSON fail', this.name, true); }
}

class MockSuccessGemini implements AiProvider {
  name = 'gemini';
  async chat() { return 'Gemini response'; }
  async chatStream() { }
  async embed() { return Array(1536).fill(0.2); }
  async generateJSON<T>() { return { success: true } as T; }
}

class MockSuccessOllama implements AiProvider {
  name = 'ollama';
  async chat() { return 'Ollama response'; }
  async chatStream() { }
  async embed() { return Array(1536).fill(0.1); }
  async generateJSON<T>() { return { success: true } as T; }
}

async function runTests() {
  console.log('--- Running AI Router Tests ---');

  // Test 1: Ollama OK
  console.log('\\nTest 1: Ollama OK');
  let router = new ProviderRouter();
  (router as any).ollama = new MockSuccessOllama();
  (router as any).gemini = new MockSuccessGemini();
  // Override settings lookup
  (router as any).canUseFallback = async () => true;
  
  let res = await router.chat({ messages: [{role: 'user', content: 'test'}], taskType: 'quizGeneration' });
  if (res === 'Ollama response') console.log('✅ Ollama OK passed');
  else console.error('❌ Ollama OK failed', res);

  // Test 2: Ollama down so Gemini is used
  console.log('\\nTest 2: Ollama down, Fallback to Gemini');
  router = new ProviderRouter();
  (router as any).ollama = new MockFailingOllama();
  (router as any).gemini = new MockSuccessGemini();
  (router as any).canUseFallback = async () => true;

  res = await router.chat({ messages: [{role: 'user', content: 'test'}], taskType: 'quizGeneration' });
  if (res === 'Gemini response') console.log('✅ Fallback to Gemini passed');
  else console.error('❌ Fallback to Gemini failed', res);

  // Test 3: Circuit breaker open and recovery
  console.log('\\nTest 3: Circuit breaker');
  const failingOllama = new MockFailingOllama();
  (router as any).ollama = failingOllama;
  
  // Hit it 3 times
  await router.chat({ messages: [], taskType: 'quizGeneration' }); // Fail 1 (Total: 2 for this instance)
  await router.chat({ messages: [], taskType: 'quizGeneration' }); // Fail 2 (Total: 3)
  
  const isBroken = await (router as any).isOllamaCircuitBroken();
  if (isBroken) console.log('✅ Circuit breaker opened');
  else console.error('❌ Circuit breaker did not open');

  // Fast forward time to test recovery
  (router as any).ollamaNextRetryTime = Date.now() - 1000;
  const isRecovered = !(await (router as any).isOllamaCircuitBroken());
  if (isRecovered) console.log('✅ Circuit breaker recovered (half-open)');
  else console.error('❌ Circuit breaker did not recover');

  // Test 4: Master switch off
  console.log('\\nTest 4: Master switch off');
  router = new ProviderRouter();
  (router as any).ollama = new MockFailingOllama();
  (router as any).gemini = new MockSuccessGemini();
  (router as any).canUseFallback = async () => false; // Master switch off simulated

  try {
    await router.chat({ messages: [], taskType: 'quizGeneration' });
    console.error('❌ Master switch off failed (did not throw)');
  } catch (e: any) {
    if (e.message.includes('AI is temporarily unavailable')) {
      console.log('✅ Master switch off passed');
    } else {
      console.error('❌ Master switch off failed with wrong error', e);
    }
  }

  console.log('\\nAll tests completed.');
}

runTests().catch(console.error);
