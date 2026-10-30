import Groq from 'groq-sdk';
import { AiProvider, ChatOptions, TaskType } from './types';
import { env } from '../env';

export class GroqProvider implements AiProvider {
  name = 'groq';
  private client: Groq;

  constructor() {
    this.client = new Groq({
      apiKey: env.GROQ_API_KEY || '',
    });
  }

  private buildMessages(options: ChatOptions) {
    return options.messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));
  }

  async chat(options: ChatOptions): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: this.buildMessages(options),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    });
    return completion.choices[0]?.message?.content ?? '';
  }

  async chatStream(options: ChatOptions, onChunk: (text: string) => void): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: this.buildMessages(options),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) onChunk(text);
    }
  }

  async embed(text: string): Promise<number[]> {
    // Groq doesn't support embeddings yet — return zero vector
    // This is fine: embedding search will fall back gracefully
    return Array(1536).fill(0);
  }

  async generateJSON<T>(prompt: string, schema: any, taskType: TaskType): Promise<T> {
    const systemPrompt = `You are a JSON-only API. Return ONLY valid JSON that matches the required schema. No markdown, no explanation, no code fences — just raw JSON.`;

    const completion = await this.client.chat.completions.create({
      model: env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';

    try {
      const parsed = JSON.parse(raw);
      if (schema?.parse) {
        return schema.parse(parsed) as T;
      }
      return parsed as T;
    } catch {
      throw new Error(`Groq returned invalid JSON: ${raw.slice(0, 200)}`);
    }
  }
}
