import Link from 'next/link';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth';
import { getDashboardForRole } from '@/lib/routes';

export default async function NotFound() {
  let homeLink = '/login';
  
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ll_token')?.value;
    if (token) {
      const payload = await getUser();
      if (payload) {
        homeLink = getDashboardForRole(payload.role);
      }
    }
  } catch(e) {}

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <div className="max-w-md p-8 border-4 border-primary rounded-lg bg-card shadow-lg text-center">
        <h2 className="text-4xl font-black text-secondary mb-2">404</h2>
        <h3 className="text-xl font-bold text-primary mb-4">Page Not Found</h3>
        <p className="text-muted-foreground mb-6">
          Could not find requested resource. It might have been removed or the link is incorrect.
        </p>
        <Link
          href={homeLink}
          className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

export const instant = false;
