import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StudyBuddyToggle } from '../client-components';

export const instant = false;

export default async function StudyBuddyPage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { wantsStudyBuddy: true, departmentId: true, year: true }
  });

  // Find students in the same department/year who opted in (exclude self)
  const suggestedBuddies = user?.wantsStudyBuddy
    ? await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          wantsStudyBuddy: true,
          departmentId: user.departmentId,
          year: user.year,
          isActive: true,
          isBlocked: false,
          id: { not: payload.userId }
        },
        select: { id: true, name: true, loginId: true },
        take: 10
      })
    : [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Buddy</h1>
          <p className="text-muted-foreground mt-1">Connect with classmates to study together</p>
        </div>
        <StudyBuddyToggle initialOptIn={user?.wantsStudyBuddy || false} />
      </div>

      {!user?.wantsStudyBuddy && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-blue-800 font-medium mb-2">You haven&apos;t opted into Study Buddy matchmaking yet.</p>
          <p className="text-blue-600 text-sm">Toggle the switch above to start connecting with classmates in your department and year.</p>
        </div>
      )}

      {user?.wantsStudyBuddy && (
        <Card>
          <CardHeader>
            <CardTitle>
              Suggested Buddies
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({suggestedBuddies.length} students in your year opted in)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suggestedBuddies.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No other students in your year have opted in yet. Share this feature with your classmates!
              </p>
            ) : (
              <div className="divide-y">
                {suggestedBuddies.map(buddy => (
                  <div key={buddy.id} className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {buddy.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{buddy.name}</p>
                        <p className="text-xs text-muted-foreground">{buddy.loginId}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Available</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
