'use server';

import { prisma } from '@/lib/prisma';
import { defineAction } from '@/lib/action-wrapper';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export const joinClassroom = defineAction(
  z.object({
    joinCode: z.string().min(1, 'Join code is required'),
    idempotencyKey: z.string().optional()
  }),
  async ({ joinCode }, session) => {
    const classroom = await prisma.classroom.findUnique({
      where: { joinCode: joinCode.trim() },
      include: { teacher: true }
    });

    if (!classroom) {
      throw new Error('Invalid join code.');
    }

    if (classroom.isArchived) {
      throw new Error('This classroom is archived and cannot be joined.');
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_classroomId: { userId: session.userId, classroomId: classroom.id } }
    });

    if (existing) {
      throw new Error('You are already enrolled in this classroom.');
    }

    if (classroom.requiresApproval) {
      const existingReq = await prisma.classroomJoinRequest.findUnique({
        where: { classroomId_studentId: { classroomId: classroom.id, studentId: session.userId } }
      });
      if (existingReq && existingReq.status === 'PENDING') {
        return { success: true, pendingApproval: true, message: 'Request pending teacher approval.' };
      }

      await prisma.classroomJoinRequest.upsert({
        where: { classroomId_studentId: { classroomId: classroom.id, studentId: session.userId } },
        create: {
          classroomId: classroom.id,
          studentId: session.userId,
          status: 'PENDING'
        },
        update: {
          status: 'PENDING'
        }
      });

      // Notify teacher
      await prisma.notification.create({
        data: {
          userId: classroom.teacherId,
          title: 'New Classroom Join Request',
          message: `${session.name} (${session.loginId}) requested to join "${classroom.name}".`,
          link: `/teacher/classrooms`
        }
      });

      return { success: true, pendingApproval: true, message: 'Request pending teacher approval.' };
    }

    await prisma.enrollment.create({
      data: {
        userId: session.userId,
        classroomId: classroom.id,
      }
    });

    revalidatePath('/student');
    revalidatePath('/student/classrooms');
    return { success: true, enrolled: true, message: 'Enrolled successfully.' };
  },
  { roles: ['STUDENT'], auditAction: 'JOIN_CLASSROOM' }
);

export const submitFeedback = defineAction(
  z.object({
    classroomId: z.string().min(1),
    comment: z.string().min(1, 'Feedback cannot be empty'),
  }),
  async ({ classroomId, comment }, session) => {
    await prisma.courseFeedback.create({
      data: {
        classroomId,
        comment,
        rating: 5,
      }
    });
    
    revalidatePath('/student/feedback');
    return { success: true };
  },
  { roles: ['STUDENT'] }
);

export const toggleStudyBuddy = defineAction(
  z.object({
    optIn: z.boolean(),
  }),
  async ({ optIn }, session) => {
    await prisma.user.update({
      where: { id: session.userId },
      data: { wantsStudyBuddy: optIn }
    });
    revalidatePath('/student/study-buddy');
    return { success: true };
  },
  { roles: ['STUDENT'] }
);

export const postDoubtWall = defineAction(
  z.object({
    classroomId: z.string().min(1),
    title: z.string().min(1),
    content: z.string().min(1),
  }),
  async ({ classroomId, title, content }, session) => {
    await prisma.doubtWallPost.create({
      data: {
        classroomId,
        studentId: session.userId,
        title,
        content
      }
    });
    revalidatePath(`/student/classrooms/${classroomId}`);
    return { success: true };
  },
  { roles: ['STUDENT'], auditAction: 'POST_DOUBT_WALL' }
);

export const startTest = defineAction(
  z.object({
    testId: z.string().min(1),
    idempotencyKey: z.string().optional()
  }),
  async ({ testId }, session) => {
    const test = await prisma.test.findUnique({ where: { id: testId }, include: { questions: { select: { questionId: true } } } });
    if (!test) throw new Error("Test not found");

    const now = new Date();
    if (now < test.startTime || now > test.endTime) {
      throw new Error("Test is outside the allowed time window.");
    }

    const existing = await prisma.testAttempt.findUnique({
      where: { testId_studentId: { testId, studentId: session.userId } }
    });

    if (existing) {
      if (existing.status !== 'IN_PROGRESS') {
        throw new Error("Test already submitted.");
      }
      return { success: true, redirectUrl: `/student/tests/${testId}` };
    }

    // Stable randomised order
    let qIds = test.questions.map(q => q.questionId);
    if (test.randomize) {
      qIds = qIds.sort(() => Math.random() - 0.5);
    }

    const attempt = await prisma.testAttempt.create({
      data: {
        testId,
        studentId: session.userId,
        status: 'IN_PROGRESS',
        startTime: new Date()
        // If we want to store the random order in the DB, we can create empty TestAnswer rows now.
      }
    });

    // Create stable empty answers to lock the order
    await prisma.testAnswer.createMany({
       data: qIds.map(qid => ({
          attemptId: attempt.id,
          questionId: qid,
          answer: ''
       }))
    });

    revalidatePath('/student/tests');
    return { success: true, redirectUrl: `/student/tests/${testId}` };
  },
  { roles: ['STUDENT'], auditAction: 'START_TEST' }
);

export const submitAssignment = defineAction(
  z.object({
    assignmentId: z.string().min(1),
    textContent: z.string().optional(),
    fileIds: z.string().optional(), // Comma separated DB file IDs
    idempotencyKey: z.string().optional()
  }),
  async ({ assignmentId, textContent, fileIds }, session) => {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId }
    });
    
    if (!assignment) throw new Error("Assignment not found");

    const now = new Date();
    let status = 'SUBMITTED';

    if (now > assignment.dueDate) {
      if (!assignment.allowLate) {
        throw new Error("This assignment does not accept late submissions.");
      }
      status = 'LATE';
    }

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: session.userId } }
    });

    if (existing) {
       // Re-submit logic (version history could be added by keeping a SubmissionsHistory table, but here we just update)
       await prisma.submission.update({
         where: { id: existing.id },
         data: {
           textContent,
           files: fileIds,
           status,
           submittedAt: now
         }
       });
    } else {
       await prisma.submission.create({
         data: {
           assignmentId,
           studentId: session.userId,
           textContent,
           files: fileIds,
           status,
           submittedAt: now
         }
       });
    }

    revalidatePath(`/student/assignments/${assignmentId}`);
    revalidatePath('/student/assignments');
    
    // Dispatch Plagiarism Check Job
    // The prompt: queue a plagiarism similarity job 
    // We import dispatchJob dynamically or just use standard import if at top level
    const { dispatchJob } = await import('@/lib/jobs/registry');
    await dispatchJob('CHECK_PLAGIARISM', { assignmentId });

    return { success: true };
  },
  { roles: ['STUDENT'], auditAction: 'SUBMIT_ASSIGNMENT' }
);

