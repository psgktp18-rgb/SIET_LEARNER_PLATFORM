import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';

export const instant = false;

export default async function HodLayout({ children }: { children: React.ReactNode }) {
  const payload = await getUser();
  if (!payload || (!payload.isHod && payload.role !== 'HOD' && payload.role !== 'ADMIN')) {
    redirect('/login');
  }

  return <AppLayout user={payload}>{children}</AppLayout>;
}
