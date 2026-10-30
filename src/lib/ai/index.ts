import { AiProvider, ChatOptions, AiError, TaskType } from './types';
import { OllamaProvider } from './ollama';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { MockProvider } from './mock';
import { env } from '../env';
import { prisma } from '../prisma';

class CircuitBreaker {
  public consecutiveFailures = 0;
  public nextRetryTime = 0;

  isOpen(): boolean {
    if (this.consecutiveFailures >= 3) {
      if (Date.now() > this.nextRetryTime) {
        return false; // Half-open: allow one retry
      }
      return true; // Open: blocking
    }
    return false; // Closed: healthy
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
  private groq = new GroqProvider();
  private mock = new MockProvider();
  
  private breakers = {
    ollama: new CircuitBreaker(),
    gemini: new CircuitBreaker(),
    groq: new CircuitBreaker(),
  };

  private getProviderByName(name: string): AiProvider | null {
    if (name === 'ollama') return this.ollama;
    if (name === 'gemini') return this.gemini;
    if (name === 'groq') return this.groq;
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
    // Always allow fallback to Gemini when it's configured
    if (env.AI_FALLBACK === 'gemini' && env.GEMINI_API_KEY) {
      return true;
    }
    // Check DB setting for custom fallback policies
    try {
      const settings = await prisma.systemSetting.findFirst();
      if (!settings || !settings.aiMasterSwitch) return false;
      const taskFallbacks = JSON.parse(settings.taskFallbacks || '{}');
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
      // Non-fatal - don't block AI responses due to logging failures
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

    // Mock shortcut
    if (primary === this.mock) {
      return await operation(this.mock);
    }

    // Try Primary
    if (primary) {
      const primaryBreaker = this.breakers[primary.name as keyof typeof this.breakers];
      if (!primaryBreaker || !primaryBreaker.isOpen()) {
        try {
          const result = await operation(primary);
          primaryBreaker?.recordSuccess();
          this.logUsage(taskType, primary.name, Date.now() - startTime, true, false).catch(() => {});
          return result;
        } catch (err: any) {
          primaryBreaker?.recordFailure();
          this.logUsage(taskType, primary.name, Date.now() - startTime, false, false).catch(() => {});
          console.warn(`Primary AI provider '${primary.name}' failed: ${err.message}. Trying fallback...`);
          // Fallthrough to fallback
        }
      }
    }

    // Try Fallback
    if (!fallback || fallback === primary) {
      throw new AiError(
        'AI is temporarily unavailable. Please check your AI provider configuration.',
        this.name,
        false
      );
    }

    // Check if fallback is allowed (either by DB setting or if Gemini key is configured)
    const allowFallback = await this.canUseFallback(taskType);
    if (!allowFallback) {
      throw new AiError(
        'AI fallback is not enabled. Enable it in Admin → AI Settings.',
        this.name,
        false
      );
    }

    const fallbackBreaker = this.breakers[fallback.name as keyof typeof this.breakers];
    if (fallbackBreaker && fallbackBreaker.isOpen()) {
      throw new AiError('All AI providers are temporarily unavailable. Please try again in 60 seconds.', this.name, false);
    }

    const fallbackStartTime = Date.now();
    try {
      const result = await operation(fallback);
      fallbackBreaker?.recordSuccess();
      this.logUsage(taskType, fallback.name, Date.now() - fallbackStartTime, true, true).catch(() => {});
      return result;
    } catch (err: any) {
      fallbackBreaker?.recordFailure();
      this.logUsage(taskType, fallback.name, Date.now() - fallbackStartTime, false, true).catch(() => {});
      throw new AiError(
        `AI is temporarily unavailable: ${err.message || 'All providers failed'}`,
        this.name,
        false
      );
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
