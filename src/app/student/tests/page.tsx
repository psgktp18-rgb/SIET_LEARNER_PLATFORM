import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock, PlayCircle, CheckCircle } from 'lucide-react';

export default async function TestsPage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') return redirect('/login');
  
  const tests = await prisma.test.findMany({
    where: { classroom: { enrollments: { some: { userId: payload.userId } } } }
  });

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tests</h1>
      </div>
      
      {tests.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          No tests have been scheduled for your classes yet.
        </div>
      ) : (
        <div className="grid gap-6">
           {tests.map(e => (
             <Card key={e.id}>
               <CardHeader><CardTitle>{e.title}</CardTitle></CardHeader>
               <CardContent>
                 <p>{new Date(e.startTime).toLocaleString()}</p>
                 <Link href={`/student/tests/${e.id}`}>
                   <Button className="mt-4">Go to Test</Button>
                 </Link>
               </CardContent>
             </Card>
           ))}
        </div>
      )}
    </div>
  );
}

export const instant = false;
