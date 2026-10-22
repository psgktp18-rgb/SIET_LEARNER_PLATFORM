import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsClient } from './client';

export const instant = false;

export default async function AdminSettingsPage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'ADMIN') redirect('/login');

  const settings = await prisma.systemSetting.findFirst();

  return <SettingsClient settings={settings} />;
}
