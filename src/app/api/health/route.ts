import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const status = {
    app: 'UP',
    database: 'UNKNOWN',
    ai: 'UNKNOWN',
    timestamp: new Date().toISOString()
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'UP';
  } catch (error) {
    status.database = 'DOWN';
  }

  try {
    const res = await fetch(process.env.OLLAMA_BASE_URL || 'http://localhost:11434', { method: 'HEAD', signal: AbortSignal.timeout(2000) }).catch(() => null);
    if (res?.ok || res?.status === 200 || res?.status === 404) {
      // 404 is also fine, it means the server is reachable
      status.ai = 'UP';
    } else {
      status.ai = 'DOWN';
    }
  } catch (error) {
    status.ai = 'DOWN';
  }

  const code = (status.database === 'UP') ? 200 : 503;
  return NextResponse.json(status, { status: code });
}
