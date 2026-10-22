import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  ENCRYPTION_KEY: z.string().default('secret_encryption_key_for_dev_only'),
  APP_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MAX_UPLOAD_MB: z.coerce.number().default(10),
  JITSI_DOMAIN: z.string().default('meet.jit.si'),
  AI_PRIMARY: z.string().default('ollama'),
  AI_FALLBACK: z.string().default('gemini'),
  AI_PROVIDER: z.string().default('router'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_CHAT_MODEL: z.string().default('qwen2.5:7b-instruct'),
  OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
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
