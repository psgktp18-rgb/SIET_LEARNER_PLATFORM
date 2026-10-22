import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';

export const instant = false;

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const payload = await getUser();
  if (!payload || (payload.role !== 'TEACHER' && payload.role !== 'HOD' && payload.role !== 'ADMIN')) {
    redirect('/login');
  }

  return <AppLayout user={payload}>{children}</AppLayout>;
}
