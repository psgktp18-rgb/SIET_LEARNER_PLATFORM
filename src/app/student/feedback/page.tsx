import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FeedbackForm } from '../client-components';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const instant = false;

export default async function FeedbackPage() {
  
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') return redirect('/login');

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: payload.userId },
    include: { classroom: { include: { subject: true } } }
  });

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {enrollments.length === 0 ? (
           <p className="text-muted-foreground">No active courses for feedback.</p>
         ) : enrollments.map(en => (
           <Card key={en.classroomId}>
              <CardHeader><CardTitle>Course Feedback: {en.classroom.subject.name}</CardTitle></CardHeader>
              <CardContent>
                 <FeedbackForm classroomId={en.classroomId} subjectName={en.classroom.subject.name} />
              </CardContent>
           </Card>
         ))}
      </div>
    </div>
  );
}
