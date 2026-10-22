'use server';

import { defineAction, assertTeachesClassroom } from '@/lib/action-wrapper';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

export const startQrSession = defineAction(
  z.object({
    classroomId: z.string().min(1)
  }),
  async ({ classroomId }, session) => {
    await assertTeachesClassroom(session.userId, classroomId);

    // End any existing live sessions
    await prisma.qrAttendanceSession.updateMany({
       where: { classroomId, endTime: null },
       data: { endTime: new Date() }
    });
    await prisma.meeting.updateMany({
       where: { classroomId, status: 'LIVE' },
       data: { status: 'COMPLETED' }
    });

    const now = new Date();
    // Create a Meeting to attach attendance to
    const meeting = await prisma.meeting.create({
      data: {
        title: 'QR Class Session',
        classroomId,
        teacherId: session.userId,
        scheduledFor: now,
        isInstant: true,
        status: 'LIVE',
        roomName: crypto.randomBytes(8).toString('hex')
      }
    });

    // Create the QR Rotation session
    const qrSession = await prisma.qrAttendanceSession.create({
      data: {
        classroomId,
        teacherId: session.userId,
        currentQrCode: crypto.randomBytes(16).toString('hex'),
        qrCodeExpiresAt: new Date(now.getTime() + 35000), // 35s
        startTime: now
      }
    });

    revalidatePath(`/teacher/classrooms/${classroomId}`);
    return { qrSessionId: qrSession.id, meetingId: meeting.id };
  },
  { roles: ['TEACHER'], auditAction: 'START_QR_SESSION' }
);

export const stopQrSession = defineAction(
  z.object({
    qrSessionId: z.string().min(1),
    meetingId: z.string().min(1)
  }),
  async ({ qrSessionId, meetingId }, session) => {
    const qrSession = await prisma.qrAttendanceSession.findUnique({ where: { id: qrSessionId }});
    if (!qrSession || qrSession.teacherId !== session.userId) throw new Error("Not authorized");

    await prisma.qrAttendanceSession.update({
      where: { id: qrSessionId },
      data: { endTime: new Date() }
    });

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'COMPLETED' }
    });

    revalidatePath(`/teacher/classrooms/${qrSession.classroomId}`);
    return { success: true };
  },
  { roles: ['TEACHER'], auditAction: 'STOP_QR_SESSION' }
);

// Manual attendance
export const saveManualAttendance = defineAction(
  z.object({
    meetingId: z.string().min(1),
    attendances: z.array(z.object({
      studentId: z.string(),
      status: z.enum(['PRESENT', 'ABSENT', 'ON_DUTY'])
    }))
  }),
  async ({ meetingId, attendances }, session) => {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId }});
    if (!meeting || meeting.teacherId !== session.userId) throw new Error("Not authorized");

    // Perform inside transaction
    await prisma.$transaction(async (tx) => {
       for (const record of attendances) {
          if (record.status === 'PRESENT' || record.status === 'ON_DUTY') {
             // Upsert
             const existing = await tx.attendance.findUnique({ where: { meetingId_studentId: { meetingId, studentId: record.studentId } } });
             if (!existing) {
                await tx.attendance.create({
                  data: { meetingId, studentId: record.studentId, joinTime: new Date() }
                });
             }
          } else if (record.status === 'ABSENT') {
             // Delete if present
             await tx.attendance.deleteMany({
                where: { meetingId, studentId: record.studentId }
             });
          }
       }
    });

    revalidatePath(`/teacher/classrooms/${meeting.classroomId}`);
    return { success: true };
  },
  { roles: ['TEACHER'], auditAction: 'SAVE_MANUAL_ATTENDANCE' }
);

// Marks
export const saveMarksDraft = defineAction(
  z.object({
    classroomId: z.string().min(1),
    componentId: z.string().min(1),
    marksData: z.array(z.object({
      studentId: z.string(),
      marks: z.number().nullable()
    }))
  }),
  async ({ classroomId, componentId, marksData }, session) => {
    await assertTeachesClassroom(session.userId, classroomId);

    // Ensure not locked
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId }});
    if (!classroom) throw new Error("Not found");
    
    const finalised = await prisma.finalisedSubjectMarks.findUnique({
      where: { subjectId_classroomId: { subjectId: classroom.subjectId, classroomId } }
    });
    if (finalised?.isLocked) throw new Error("Marks are locked and cannot be edited");

    await prisma.$transaction(
      marksData.map(m => 
        prisma.studentMark.upsert({
          where: { componentId_studentId_classroomId: { componentId, studentId: m.studentId, classroomId } },
          create: { componentId, studentId: m.studentId, classroomId, marks: m.marks },
          update: { marks: m.marks }
        })
      )
    );

    return { success: true };
  },
  { roles: ['TEACHER'], auditAction: 'SAVE_MARKS_DRAFT' }
);

export const finaliseMarks = defineAction(
  z.object({
    classroomId: z.string().min(1)
  }),
  async ({ classroomId }, session) => {
    await assertTeachesClassroom(session.userId, classroomId);

    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId }});
    if (!classroom) throw new Error("Not found");

    await prisma.finalisedSubjectMarks.upsert({
      where: { subjectId_classroomId: { subjectId: classroom.subjectId, classroomId } },
      create: {
        subjectId: classroom.subjectId,
        classroomId,
        teacherId: session.userId,
        isLocked: true,
        lockedAt: new Date()
      },
      update: {
        isLocked: true,
        lockedAt: new Date()
      }
    });

    return { success: true };
  },
  { roles: ['TEACHER'], auditAction: 'FINALISE_MARKS' }
);
