import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default(process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy?schema=public'),
  JWT_SECRET: z.string().default(process.env.JWT_SECRET || 'supersecret_jwt_key_at_least_32_characters_long_for_dev'),
  ENCRYPTION_KEY: z.string().default(process.env.ENCRYPTION_KEY || 'secret_encryption_key_for_dev_only'),
  APP_URL: z.string().default(process.env.APP_URL || 'http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default((process.env.NODE_ENV as any) || 'development'),
  MAX_UPLOAD_MB: z.coerce.number().default(10),
  JITSI_DOMAIN: z.string().default('meet.jit.si'),
  AI_PRIMARY: z.string().default(process.env.AI_PRIMARY || 'ollama'),
  AI_FALLBACK: z.string().default(process.env.AI_FALLBACK || 'gemini'),
  AI_PROVIDER: z.string().default(process.env.AI_PROVIDER || 'router'),
  OLLAMA_BASE_URL: z.string().default(process.env.OLLAMA_BASE_URL || 'http://localhost:11434'),
  OLLAMA_CHAT_MODEL: z.string().default(process.env.OLLAMA_CHAT_MODEL || 'qwen2.5:7b-instruct'),
  OLLAMA_EMBED_MODEL: z.string().default(process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default(process.env.GEMINI_MODEL || 'gemini-1.5-flash'),
  AI_TIMEOUT_MS: z.coerce.number().default(30000),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;

if (env.AI_FALLBACK === 'gemini' && !env.GEMINI_API_KEY) {
  console.warn('⚠️ WARNING: AI_FALLBACK is set to "gemini" but GEMINI_API_KEY is missing. AI requests may fail.');
}
