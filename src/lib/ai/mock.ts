import { AiProvider, ChatOptions, TaskType } from './types';

export class MockProvider implements AiProvider {
  name = 'mock';

  async chat(options: ChatOptions): Promise<string> {
    return 'Mock chat response for ' + options.messages[options.messages.length - 1].content;
  }

  async chatStream(options: ChatOptions, onChunk: (text: string) => void): Promise<void> {
    onChunk('Mock ');
    onChunk('stream ');
    onChunk('response.');
  }

  async embed(text: string): Promise<number[]> {
    return Array(1536).fill(0.1);
  }

  async generateJSON<T>(prompt: string, schema: any, taskType: TaskType): Promise<T> {
    // Generate an empty/valid dummy object according to schema
    // Since we don't have a generic fake data generator, we rely on test mocks configuring this if needed.
    // For now, return a basic structure assuming mostly standard shapes or fallback to {}
    return {} as T; 
  }
}
