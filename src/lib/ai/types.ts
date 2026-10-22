export type TaskType = 
  | 'quizGeneration' 
  | 'flashcardGeneration' 
  | 'studyDoubtBot' 
  | 'platformHelpBot' 
  | 'revisionTools' 
  | 'classInsights' 
  | 'assignmentFeedback' 
  | 'shortAnswerGrading';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  taskType: TaskType;
  temperature?: number;
  maxTokens?: number;
}

export interface AiProvider {
  name: string;
  chat(options: ChatOptions): Promise<string>;
  chatStream(options: ChatOptions, onChunk: (text: string) => void): Promise<void>;
  embed(text: string): Promise<number[]>;
  generateJSON<T>(prompt: string, schema: any, taskType: TaskType): Promise<T>;
}

export class AiError extends Error {
  constructor(message: string, public provider: string, public isRetryable: boolean = false) {
    super(message);
    this.name = 'AiError';
  }
}
