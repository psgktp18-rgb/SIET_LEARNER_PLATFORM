import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const settingsSchema = z.object({
  collegeName: z.string().optional(),
  academicYear: z.string().optional(),
  attendanceThreshold: z.coerce.number().min(0).max(100).optional(),
  aiMasterSwitch: z.boolean().optional(),
  enabledYears: z.array(z.number()).optional(),
  maxUploadSizeMB: z.coerce.number().optional(),
  aiPrimaryProvider: z.string().optional(),
  ollamaChatModel: z.string().optional(),
  examMode: z.boolean().optional(),
  themePrimaryColor: z.string().optional(),
  classroomCreationRule: z.enum(['ADMIN_ONLY', 'ADMIN_HOD', 'ADMIN_HOD_TEACHER']).optional(),
});

export async function GET(req: NextRequest) {
  const payload = await getUser();
  if (!payload || payload.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const settings = await prisma.systemSetting.findFirst();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    const payload = await getUser();
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updates = settingsSchema.parse(body);

    const setting = await prisma.systemSetting.findFirst();
    if (!setting) return NextResponse.json({ error: 'Settings not initialized' }, { status: 404 });

    const data: any = {};
    if (updates.collegeName !== undefined) data.collegeName = updates.collegeName;
    if (updates.academicYear !== undefined) data.academicYear = updates.academicYear;
    if (updates.attendanceThreshold !== undefined) data.attendanceThreshold = updates.attendanceThreshold;
    if (updates.aiMasterSwitch !== undefined) data.aiMasterSwitch = updates.aiMasterSwitch;
    if (updates.enabledYears !== undefined) data.enabledYears = JSON.stringify(updates.enabledYears);
    if (updates.maxUploadSizeMB !== undefined) data.maxUploadSizeMB = updates.maxUploadSizeMB;
    if (updates.aiPrimaryProvider !== undefined) data.aiPrimaryProvider = updates.aiPrimaryProvider;
    if (updates.ollamaChatModel !== undefined) data.ollamaChatModel = updates.ollamaChatModel;
    if (updates.examMode !== undefined) data.examMode = updates.examMode;
    if (updates.themePrimaryColor !== undefined) data.themePrimaryColor = updates.themePrimaryColor;
    if (updates.classroomCreationRule !== undefined) data.classroomCreationRule = updates.classroomCreationRule;

    const updated = await prisma.systemSetting.update({
      where: { id: setting.id },
      data
    });

    await logAudit({ userId: payload.userId, action: 'UPDATE_SYSTEM_SETTINGS', details: `Admin updated system settings: ${Object.keys(data).join(', ')}` });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error('[PATCH /api/admin/settings]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
