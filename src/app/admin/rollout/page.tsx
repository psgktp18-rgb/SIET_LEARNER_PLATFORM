import { prisma } from '@/lib/prisma';
import RolloutClient from './RolloutClient';

export const instant = false;

export default async function RolloutPage() {
  const departments = await prisma.department.findMany();
  const settings = await prisma.systemSetting.findFirst();
  let enabledYears = [3];
  try {
    enabledYears = JSON.parse(settings?.enabledYears || '[3]');
  } catch (e) {}

  return <RolloutClient initialEnabledYears={enabledYears} departments={departments} />
}
