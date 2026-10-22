import { prisma } from './prisma';

export async function logAudit(payload: { userId?: string, actorRole?: string, actorLabel?: string, targetUserId?: string, action: string, details?: string }) {
  try {
    await prisma.auditLog.create({
      data: payload as any,
    });
  } catch (error) {
    // Silently fail to never throw errors on critical paths
    console.error('Failed to log audit event:', error);
  }
}
