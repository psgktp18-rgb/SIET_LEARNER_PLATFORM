import { env } from '../env';
import { prisma } from '../prisma';

export interface AiStatus {
  isConfigured: boolean;
  provider: string;
  reason?: string;
  masterEnabled: boolean;
}

export async function checkAiConfigured(): Promise<AiStatus> {
  const settings = await prisma.systemSetting.findFirst();
  const masterEnabled = settings?.aiMasterSwitch ?? true;

  if (!masterEnabled) {
    return {
      isConfigured: false,
      provider: 'disabled',
      masterEnabled: false,
      reason: 'AI features are currently turned off in System Settings.',
    };
  }

  if (env.AI_PROVIDER === 'mock') {
    return {
      isConfigured: true,
      provider: 'mock',
      masterEnabled: true,
    };
  }

  const primary = env.AI_PRIMARY;
  const fallback = env.AI_FALLBACK;

  const hasGeminiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0;
  const hasOllama = !!env.OLLAMA_BASE_URL;

  if (primary === 'gemini' && !hasGeminiKey) {
    if (fallback === 'ollama' && hasOllama) {
      return { isConfigured: true, provider: 'ollama (fallback)', masterEnabled: true };
    }
    return {
      isConfigured: false,
      provider: 'gemini',
      masterEnabled: true,
      reason: 'GEMINI_API_KEY is not configured in the server environment.',
    };
  }

  if (primary === 'ollama' && !hasOllama) {
    if (fallback === 'gemini' && hasGeminiKey) {
      return { isConfigured: true, provider: 'gemini (fallback)', masterEnabled: true };
    }
    return {
      isConfigured: false,
      provider: 'ollama',
      masterEnabled: true,
      reason: 'Ollama base URL is not configured.',
    };
  }

  // If both gemini and ollama are primary/fallback
  if (!hasGeminiKey && primary === 'gemini') {
    return {
      isConfigured: false,
      provider: 'none',
      masterEnabled: true,
      reason: 'No AI provider credentials configured.',
    };
  }

  return {
    isConfigured: true,
    provider: primary,
    masterEnabled: true,
  };
}
