import { defineRoute } from '@/lib/action-wrapper';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const POST = defineRoute(
  z.object({
    sessionId: z.string().min(1),
  }),
  async (input, session) => {
    // Only teacher can rotate
    const qrSession = await prisma.qrAttendanceSession.findUnique({
      where: { id: input.sessionId }
    });

    if (!qrSession) throw new Error("Session not found");
    if (qrSession.teacherId !== session.userId) throw new Error("Not your session");
    if (qrSession.endTime) throw new Error("Session is ended");

    // Generate new token (random string)
    const newToken = crypto.randomBytes(16).toString('hex');
    // Expire in 35 seconds (30s rotation + 5s grace for network latency)
    const expiresAt = new Date(Date.now() + 35000);

    await prisma.qrAttendanceSession.update({
      where: { id: qrSession.id },
      data: {
        currentQrCode: newToken,
        qrCodeExpiresAt: expiresAt
      }
    });

    // Return the token to be embedded in the QR Code
    // In a real app, this might be a JWT signed with a secret, but a random DB-backed token works perfectly and securely here since it expires quickly.
    return { token: newToken, expiresAt };
  },
  { roles: ['TEACHER'] }
);
