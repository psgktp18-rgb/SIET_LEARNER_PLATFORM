import { AiProvider, ChatOptions, AiError, TaskType } from './types';
import { env } from '../env';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider implements AiProvider {
  name = 'gemini';
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  private getModel(isEmbedding = false, isJson = false) {
    if (!this.genAI) throw new AiError('Gemini API key not configured', this.name, false);
    
    return this.genAI.getGenerativeModel({
      model: isEmbedding ? 'text-embedding-004' : env.GEMINI_MODEL,
      generationConfig: isJson ? { responseMimeType: "application/json" } : undefined
    });
  }

  private formatMessages(messages: ChatOptions['messages']) {
    let systemInstruction = '';
    const formatted = messages.filter(m => {
      if (m.role === 'system') {
        systemInstruction += m.content + '\n';
        return false;
      }
      return true;
    }).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    return { formatted, systemInstruction };
  }

  async chat(options: ChatOptions): Promise<string> {
    try {
      const { formatted, systemInstruction } = this.formatMessages(options.messages);
      const model = this.getModel();
      
      // We can't easily pass system instruction per call in the older SDK, but let's assume standard API
      const chat = model.startChat({
        history: formatted.slice(0, -1),
      });

      // Simple implementation
      const prompt = options.messages[options.messages.length - 1].content;
      const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
      
      const result = await chat.sendMessage(fullPrompt);
      return result.response.text();
    } catch (err: any) {
      throw new AiError(err.message, this.name, false);
    }
  }

  async chatStream(options: ChatOptions, onChunk: (text: string) => void): Promise<void> {
    try {
      const { formatted, systemInstruction } = this.formatMessages(options.messages);
      const model = this.getModel();
      
      const chat = model.startChat({
        history: formatted.slice(0, -1),
      });

      const prompt = options.messages[options.messages.length - 1].content;
      const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
      
      const result = await chat.sendMessageStream(fullPrompt);
      for await (const chunk of result.stream) {
        onChunk(chunk.text());
      }
    } catch (err: any) {
      throw new AiError(err.message, this.name, false);
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const model = this.getModel(true);
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err: any) {
      throw new AiError(err.message, this.name, false);
    }
  }

  async generateJSON<T>(prompt: string, schema: any, taskType: TaskType): Promise<T> {
    try {
      const model = this.getModel(false, true);
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);
      return schema.parse(parsed) as T;
    } catch (err: any) {
      throw new AiError(err.message, this.name, false);
    }
  }
}
