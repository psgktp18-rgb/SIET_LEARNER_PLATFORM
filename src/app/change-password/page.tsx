import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { ChangePasswordForm } from './client';
export const instant = false;

export default async function ChangePasswordPage() {
  
  const payload = await getUser();
  if (!payload) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50">
      <ChangePasswordForm userName={payload.name} loginId={payload.loginId} />
    </div>
  );
}
