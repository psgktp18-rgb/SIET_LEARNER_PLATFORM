import { env } from '../env';
import { prisma } from '../prisma';

export interface AiStatus {
  isConfigured: boolean;
  provider: string;
  reason?: string;
  masterEnabled: boolean;
}

export async function checkAiConfigured(): Promise<AiStatus> {
  // Check master switch in DB (non-fatal if DB is unavailable during build)
  let masterEnabled = true;
  try {
    const settings = await prisma.systemSetting.findFirst();
    masterEnabled = settings?.aiMasterSwitch ?? true;
  } catch {
    // DB may not be available during build/CI - default to enabled
    masterEnabled = true;
  }

  if (!masterEnabled) {
    return {
      isConfigured: false,
      provider: 'disabled',
      masterEnabled: false,
      reason: 'AI features are currently turned off in System Settings.',
    };
  }

  // Mock provider (test/dev only)
  if (env.AI_PROVIDER === 'mock') {
    return {
      isConfigured: true,
      provider: 'mock',
      masterEnabled: true,
    };
  }

  const hasGeminiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0;
  const hasOllamaUrl = !!env.OLLAMA_BASE_URL && env.OLLAMA_BASE_URL !== 'http://localhost:11434';
  const isVercel = !!process.env.VERCEL;

  const primary = env.AI_PRIMARY;
  const fallback = env.AI_FALLBACK;

  // On Vercel: only Gemini is viable
  if (isVercel) {
    if (hasGeminiKey) {
      return { isConfigured: true, provider: 'gemini', masterEnabled: true };
    }
    return {
      isConfigured: false,
      provider: 'gemini',
      masterEnabled: true,
      reason: 'GEMINI_API_KEY is not set in Vercel Environment Variables. Add it in Vercel Dashboard → Settings → Environment Variables.',
    };
  }

  // Gemini as primary
  if (primary === 'gemini') {
    if (hasGeminiKey) {
      return { isConfigured: true, provider: 'gemini', masterEnabled: true };
    }
    if (fallback === 'ollama') {
      return { isConfigured: true, provider: 'ollama (fallback)', masterEnabled: true };
    }
    return {
      isConfigured: false,
      provider: 'gemini',
      masterEnabled: true,
      reason: 'GEMINI_API_KEY is not configured. Set it in your .env file.',
    };
  }

  // Ollama as primary
  if (primary === 'ollama') {
    // Ollama is assumed running locally
    if (hasGeminiKey) {
      return { isConfigured: true, provider: 'ollama + gemini (fallback)', masterEnabled: true };
    }
    return { isConfigured: true, provider: 'ollama', masterEnabled: true };
  }

  // Fallback: if Gemini key exists, use it
  if (hasGeminiKey) {
    return { isConfigured: true, provider: 'gemini', masterEnabled: true };
  }

  return {
    isConfigured: false,
    provider: 'none',
    masterEnabled: true,
    reason: 'No AI provider is configured. Set GEMINI_API_KEY in your environment variables.',
  };
}
