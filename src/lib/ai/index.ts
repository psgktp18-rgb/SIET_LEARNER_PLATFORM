import { AiProvider, ChatOptions, AiError, TaskType } from './types';
import { OllamaProvider } from './ollama';
import { GeminiProvider } from './gemini';
import { MockProvider } from './mock';
import { env } from '../env';
import { prisma } from '../prisma';

class CircuitBreaker {
  public consecutiveFailures = 0;
  public nextRetryTime = 0;

  isOpen(): boolean {
    if (this.consecutiveFailures >= 3) {
      if (Date.now() > this.nextRetryTime) {
        return false; // Half-open
      }
      return true; // Open
    }
    return false; // Closed
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
  }

  recordFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 3) {
      this.nextRetryTime = Date.now() + 60000; // 60s cooldown
    }
  }
}

export class ProviderRouter implements AiProvider {
  name = 'router';
  private ollama = new OllamaProvider();
  private gemini = new GeminiProvider();
  private mock = new MockProvider();
  
  private breakers = {
    ollama: new CircuitBreaker(),
    gemini: new CircuitBreaker(),
  };

  constructor() {
    if (process.env.NODE_ENV === 'production' && env.AI_PROVIDER === 'mock') {
      throw new Error("FATAL: AI_PROVIDER=mock is not allowed in production.");
    }
  }

  private getProviderByName(name: string): AiProvider | null {
    if (name === 'ollama') return this.ollama;
    if (name === 'gemini') return this.gemini;
    if (name === 'mock') return this.mock;
    return null;
  }

  private getPrimary(): AiProvider | null {
    if (env.AI_PROVIDER === 'mock') return this.mock;
    return this.getProviderByName(env.AI_PRIMARY);
  }

  private getFallback(): AiProvider | null {
    if (env.AI_PROVIDER === 'mock') return null;
    return this.getProviderByName(env.AI_FALLBACK);
  }

  private async canUseFallback(taskType: TaskType): Promise<boolean> {
    const settings = await prisma.systemSetting.findFirst();
    if (!settings || !settings.aiMasterSwitch) return false;
    try {
      const taskFallbacks = JSON.parse(settings.taskFallbacks);
      return !!taskFallbacks[taskType];
    } catch {
      return false;
    }
  }

  private async logUsage(taskType: string, providerName: string, latencyMs: number, success: boolean, fallbackUsed: boolean) {
    try {
      await prisma.aiUsageLog.create({
        data: {
          taskType,
          provider: providerName,
          model: providerName === 'ollama' ? env.OLLAMA_CHAT_MODEL : env.GEMINI_MODEL,
          latencyMs,
          success,
          fallbackUsed,
        }
      });
    } catch (e) {
      console.error('Failed to log AI usage', e);
    }
  }

  private async routeCall<T>(
    operation: (provider: AiProvider) => Promise<T>,
    taskType: TaskType
  ): Promise<T> {
    const startTime = Date.now();
    const primary = this.getPrimary();
    const fallback = this.getFallback();

    if (primary === this.mock) {
      return await operation(this.mock);
    }

    if (primary) {
      const primaryBreaker = this.breakers[primary.name as keyof typeof this.breakers];
      if (!primaryBreaker || !primaryBreaker.isOpen()) {
        try {
          const result = await operation(primary);
          primaryBreaker?.recordSuccess();
          await this.logUsage(taskType, primary.name, Date.now() - startTime, true, false);
          return result;
        } catch (err: any) {
          primaryBreaker?.recordFailure();
          await this.logUsage(taskType, primary.name, Date.now() - startTime, false, false);
          // Fallthrough to fallback
        }
      }
    }

    // Try Fallback
    const allowFallback = await this.canUseFallback(taskType);
    if (!allowFallback || !fallback || fallback === primary) {
      throw new AiError('AI is temporarily unavailable', this.name, false);
    }

    const fallbackBreaker = this.breakers[fallback.name as keyof typeof this.breakers];
    if (fallbackBreaker && fallbackBreaker.isOpen()) {
       throw new AiError('AI is temporarily unavailable', this.name, false);
    }

    const fallbackStartTime = Date.now();
    try {
      const result = await operation(fallback);
      fallbackBreaker?.recordSuccess();
      await this.logUsage(taskType, fallback.name, Date.now() - fallbackStartTime, true, true);
      return result;
    } catch (err: any) {
      fallbackBreaker?.recordFailure();
      await this.logUsage(taskType, fallback.name, Date.now() - fallbackStartTime, false, true);
      throw new AiError(`AI is temporarily unavailable`, this.name, false);
    }
  }

  async chat(options: ChatOptions): Promise<string> {
    return this.routeCall(
      (p) => p.chat(options),
      options.taskType
    );
  }

  async chatStream(options: ChatOptions, onChunk: (text: string) => void): Promise<void> {
    return this.routeCall(
      (p) => p.chatStream(options, onChunk),
      options.taskType
    );
  }

  async embed(text: string): Promise<number[]> {
    return this.routeCall(
      (p) => p.embed(text),
      'quizGeneration'
    );
  }

  async generateJSON<T>(prompt: string, schema: any, taskType: TaskType): Promise<T> {
    return this.routeCall(
      (p) => p.generateJSON<T>(prompt, schema, taskType),
      taskType
    );
  }
}

export const ai = new ProviderRouter();
