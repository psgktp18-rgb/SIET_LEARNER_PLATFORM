'use server';

import { defineAction } from '@/lib/action-wrapper';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import { revokedUsers } from '@/lib/auth';
import { publish } from '@/lib/realtime';

export const blockUser = defineAction(
  z.object({
    userId: z.string().min(1),
    reason: z.string()
  }),
  async ({ userId, reason }, session) => {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true, blockedBy: session.userId, blockReason: reason }
    });

    revokedUsers.add(userId);
    publish(`user:${userId}`, { type: 'force-logout', payload: { message: 'You have been signed out by the administrator.' } });

    revalidatePath('/admin/users');
    return { success: true };
  },
  { roles: ['ADMIN'], auditAction: 'BLOCK_USER' }
);

export const unblockUser = defineAction(
  z.object({
    userId: z.string().min(1)
  }),
  async ({ userId }, session) => {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false, blockedBy: null, blockReason: null }
    });

    revokedUsers.delete(userId);

    revalidatePath('/admin/users');
    return { success: true };
  },
  { roles: ['ADMIN'], auditAction: 'UNBLOCK_USER' }
);

export const updateSystemSettings = defineAction(
  z.object({
    examMode: z.boolean().optional(),
    aiMasterSwitch: z.boolean().optional(),
    enabledYears: z.array(z.number()).optional()
  }),
  async (updates) => {
    const setting = await prisma.systemSetting.findFirst();
    if (!setting) throw new Error("System settings not initialized");

    const data: any = {};
    if (updates.examMode !== undefined) data.examMode = updates.examMode;
    if (updates.aiMasterSwitch !== undefined) data.aiMasterSwitch = updates.aiMasterSwitch;
    if (updates.enabledYears !== undefined) data.enabledYears = JSON.stringify(updates.enabledYears);

    await prisma.systemSetting.update({
      where: { id: setting.id },
      data
    });

    revalidatePath('/admin/settings');
    return { success: true };
  },
  { roles: ['ADMIN'], auditAction: 'UPDATE_SYSTEM_SETTINGS' }
);

export const createMarksScheme = defineAction(
  z.object({
    subjectId: z.string().min(1),
    components: z.array(z.object({
      name: z.string(),
      maxMarks: z.number().min(1),
      weightage: z.number().min(0).max(100)
    }))
  }),
  async ({ subjectId, components }, session) => {
    // Only Admin (or HOD mapped as Admin)
    const totalWeight = components.reduce((acc, curr) => acc + curr.weightage, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error("Total weightage must equal 100%");
    }

    await prisma.$transaction(async (tx) => {
      const scheme = await tx.subjectMarksScheme.upsert({
        where: { subjectId },
        create: { subjectId },
        update: {}
      });

      // Clear old components and recreate
      await tx.markComponent.deleteMany({ where: { schemeId: scheme.id } });

      await tx.markComponent.createMany({
        data: components.map(c => ({
          schemeId: scheme.id,
          name: c.name,
          maxMarks: c.maxMarks,
          weightage: c.weightage
        }))
      });
    });

    revalidatePath('/admin/marks');
    return { success: true };
  },
  { roles: ['ADMIN'], auditAction: 'CREATE_MARKS_SCHEME' }
);

import bcrypt from 'bcrypt';

export const resetPassword = defineAction(
  z.object({
    userId: z.string().min(1)
  }),
  async ({ userId }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const defaultPassword = await bcrypt.hash(user.loginId, 10);
    
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: defaultPassword, mustChangePassword: true }
    });

    // Invalidate current session
    revokedUsers.add(userId);
    publish(`user:${userId}`, { type: 'force-logout', payload: { message: 'Your password was reset by an administrator.' } });

    revalidatePath('/admin/students');
    revalidatePath('/admin/teachers');
    return { success: true };
  },
  { roles: ['ADMIN', 'HOD'], auditAction: 'RESET_PASSWORD' }
);
