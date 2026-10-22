import { defineRoute } from '@/lib/action-wrapper';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const POST = defineRoute(
  z.object({
    token: z.string().min(1),
    idempotencyKey: z.string().optional()
  }),
  async (input, session) => {
    // Find active session with this token
    const qrSession = await prisma.qrAttendanceSession.findUnique({
      where: { currentQrCode: input.token }
    });

    if (!qrSession) throw new Error("Invalid or expired QR code");
    if (qrSession.endTime) throw new Error("Attendance session has ended");
    
    if (new Date() > qrSession.qrCodeExpiresAt) {
      throw new Error("QR code expired. Please scan the newest one on the screen.");
    }

    // Check enrollment
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_classroomId: { userId: session.userId, classroomId: qrSession.classroomId } }
    });

    if (!enrolled) throw new Error("You are not enrolled in this classroom");

    // We need a Meeting to attach the Attendance to. 
    // Find the meeting created alongside this QR session (we'll assume the active meeting for this class)
    const meeting = await prisma.meeting.findFirst({
      where: { classroomId: qrSession.classroomId, status: 'LIVE' },
      orderBy: { createdAt: 'desc' }
    });

    if (!meeting) throw new Error("No active class meeting found to record attendance");

    // Check if already marked
    const existing = await prisma.attendance.findUnique({
      where: { meetingId_studentId: { meetingId: meeting.id, studentId: session.userId } }
    });

    if (existing) {
      return { success: true, message: "Attendance already recorded for this session" }; // Idempotent success
    }

    // Record attendance
    await prisma.attendance.create({
      data: {
        meetingId: meeting.id,
        studentId: session.userId,
        joinTime: new Date()
      }
    });

    return { success: true };
  },
  { roles: ['STUDENT'], auditAction: 'MARK_QR_ATTENDANCE' }
);
