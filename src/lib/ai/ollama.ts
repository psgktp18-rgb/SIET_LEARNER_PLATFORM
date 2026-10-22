import { AiProvider, ChatOptions, AiError, TaskType } from './types';
import { env } from '../env';

export class OllamaProvider implements AiProvider {
  name = 'ollama';

  private async fetchOllama(endpoint: string, body: any, timeoutMs: number) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${env.OLLAMA_BASE_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!res.ok) {
        throw new AiError(`Ollama HTTP ${res.status}: ${await res.text()}`, this.name, true);
      }

      return res;
    } catch (err: any) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new AiError('Ollama request timed out', this.name, true);
      }
      throw new AiError(err.message, this.name, true);
    }
  }

  async chat(options: ChatOptions): Promise<string> {
    const res = await this.fetchOllama('chat', {
      model: env.OLLAMA_CHAT_MODEL,
      messages: options.messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens,
      }
    }, env.AI_TIMEOUT_MS);

    const data = await res.json();
    return data.message?.content || '';
  }

  async chatStream(options: ChatOptions, onChunk: (text: string) => void): Promise<void> {
    const res = await this.fetchOllama('chat', {
      model: env.OLLAMA_CHAT_MODEL,
      messages: options.messages,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens,
      }
    }, env.AI_TIMEOUT_MS);

    if (!res.body) throw new AiError('No stream body', this.name);
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            onChunk(parsed.message.content);
          }
        } catch (e) {
          // Ignore parse errors on stream
        }
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.fetchOllama('embeddings', {
      model: env.OLLAMA_EMBED_MODEL,
      prompt: text,
    }, env.AI_TIMEOUT_MS);

    const data = await res.json();
    return data.embedding;
  }

  async generateJSON<T>(prompt: string, schema: any, taskType: TaskType): Promise<T> {
    let attempts = 0;
    let lastError = null;
    let currentPrompt = prompt;

    while (attempts < 3) {
      try {
        const res = await this.fetchOllama('chat', {
          model: env.OLLAMA_CHAT_MODEL,
          messages: [{ role: 'user', content: currentPrompt }],
          stream: false,
          format: 'json',
        }, env.AI_TIMEOUT_MS);

        const data = await res.json();
        const jsonContent = data.message?.content || '{}';
        
        try {
          const parsed = JSON.parse(jsonContent);
          // Assuming schema is a Zod schema
          return schema.parse(parsed) as T;
        } catch (parseError: any) {
          lastError = parseError;
          // Repair prompt
          currentPrompt = `You previously generated invalid JSON. Please generate ONLY valid JSON matching the schema. Error: ${parseError.message}\n\nOriginal Prompt: ${prompt}`;
        }
      } catch (err: any) {
        lastError = err;
      }
      attempts++;
    }

    throw new AiError(`Failed to generate valid JSON after 3 attempts. Last error: ${lastError?.message}`, this.name, true);
  }
}
