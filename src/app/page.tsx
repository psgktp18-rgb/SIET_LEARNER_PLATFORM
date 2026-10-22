import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getDashboardForRole } from '@/lib/routes';

export const instant = false;

export default async function Home() {
  const payload = await getUser();
  if (payload) {
    redirect(getDashboardForRole(payload.role));
  }
  redirect('/login');
}
