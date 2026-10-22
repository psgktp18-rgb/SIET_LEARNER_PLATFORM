import { getUser, SessionPayload } from './auth';
import { prisma } from './prisma';
import { z } from 'zod';
import { logAudit } from './audit';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export type ActionState<T = any> = {
  ok: true;
  data: T;
  requestId: string;
  error?: never;
} | {
  ok: false;
  error: { code: string; message: string; fieldErrors?: any };
  requestId: string;
};

export async function getSession(): Promise<SessionPayload> {
  const user = await getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');
  return user;
}

export async function assertEnrolled(userId: string, classroomId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_classroomId: { userId, classroomId } }
  });
  if (!enrollment) throw new Error('NOT_ENROLLED');
}

export async function assertTeachesClassroom(userId: string, classroomId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom || classroom.teacherId !== userId) throw new Error('NOT_TEACHER');
}

export async function assertSameDepartment(hodId: string, studentId: string) {
  const [hod, student] = await Promise.all([
    prisma.user.findUnique({ where: { id: hodId } }),
    prisma.user.findUnique({ where: { id: studentId } })
  ]);
  if (!hod || !student || hod.departmentId !== student.departmentId) throw new Error('DEPARTMENT_MISMATCH');
}

export async function assertOwner(userId: string, targetUserId: string) {
  if (userId !== targetUserId) throw new Error('NOT_OWNER');
}

export function defineAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  handler: (input: TInput, session: SessionPayload) => Promise<TOutput>,
  options?: {
    roles?: string[];
    auditAction?: string;
  }
) {
  return async (formDataOrInput: TInput | FormData): Promise<ActionState<TOutput>> => {
    const requestId = crypto.randomUUID();
    try {
      const session = await getSession();
      
      if (options?.roles && !options.roles.includes(session.role)) {
        throw new Error('FORBIDDEN');
      }

      // Parse input
      let parsedInput: TInput;
      if (formDataOrInput instanceof FormData) {
        const obj = Object.fromEntries(formDataOrInput.entries());
        // Basic coercion for common types could go here
        parsedInput = schema.parse(obj);
      } else {
        parsedInput = schema.parse(formDataOrInput);
      }

      // Idempotency check if input has idempotencyKey
      const inputWithKey = parsedInput as any;
      if (inputWithKey.idempotencyKey) {
         const existing = await prisma.idempotencyKey.findUnique({ where: { key: inputWithKey.idempotencyKey }});
         if (existing && existing.response) {
            return { ok: true, data: JSON.parse(existing.response), requestId };
         }
      }

      const result = await handler(parsedInput, session);

      if (options?.auditAction) {
        await logAudit({ userId: session.userId, actorRole: session.role, action: options.auditAction, details: JSON.stringify(parsedInput) });
      }

      if (inputWithKey.idempotencyKey) {
         await prisma.idempotencyKey.upsert({
            where: { key: inputWithKey.idempotencyKey },
            create: { key: inputWithKey.idempotencyKey, userId: session.userId, path: 'action', response: JSON.stringify(result) },
            update: { response: JSON.stringify(result) }
         }).catch(() => {}); // silent fail on idempotency write
      }

      return { ok: true, data: result, requestId };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fieldErrors: error.flatten().fieldErrors }, requestId };
      }
      return { ok: false, error: { code: error.message || 'INTERNAL_ERROR', message: error.message || 'An error occurred' }, requestId };
    }
  };
}

export function defineRoute<TInput, TOutput>(
  schema: z.Schema<TInput>,
  handler: (input: TInput, session: SessionPayload, req: Request) => Promise<TOutput>,
  options?: {
    roles?: string[];
    auditAction?: string;
  }
) {
  return async (req: Request) => {
    const requestId = crypto.randomUUID();
    try {
      const session = await getSession();
      
      if (options?.roles && !options.roles.includes(session.role)) {
        return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' }, requestId }, { status: 403 });
      }

      let parsedInput: TInput;
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
         const body = await req.json();
         parsedInput = schema.parse(body);
      } else if (contentType.includes('multipart/form-data')) {
         const formData = await req.formData();
         const obj = Object.fromEntries(formData.entries());
         parsedInput = schema.parse(obj);
      } else {
         // Maybe searchParams
         const url = new URL(req.url);
         const obj = Object.fromEntries(url.searchParams.entries());
         parsedInput = schema.parse(obj);
      }

      const inputWithKey = parsedInput as any;
      if (inputWithKey.idempotencyKey) {
         const existing = await prisma.idempotencyKey.findUnique({ where: { key: inputWithKey.idempotencyKey }});
         if (existing && existing.response) {
            return NextResponse.json({ ok: true, data: JSON.parse(existing.response), requestId });
         }
      }

      const result = await handler(parsedInput, session, req);

      if (options?.auditAction) {
        await logAudit({ userId: session.userId, actorRole: session.role, action: options.auditAction, details: JSON.stringify(parsedInput) });
      }

      if (inputWithKey.idempotencyKey) {
         await prisma.idempotencyKey.upsert({
            where: { key: inputWithKey.idempotencyKey },
            create: { key: inputWithKey.idempotencyKey, userId: session.userId, path: req.url, response: JSON.stringify(result) },
            update: { response: JSON.stringify(result) }
         }).catch(() => {});
      }

      return NextResponse.json({ ok: true, data: result, requestId });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fieldErrors: error.flatten().fieldErrors }, requestId }, { status: 400 });
      }
      if (error.message === 'NOT_AUTHENTICATED') {
         return NextResponse.json({ ok: false, error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' }, requestId }, { status: 401 });
      }
      return NextResponse.json({ ok: false, error: { code: error.message || 'INTERNAL_ERROR', message: error.message || 'An error occurred' }, requestId }, { status: 500 });
    }
  }
}
