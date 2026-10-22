import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function DataList() {
  const payload = await getUser();
  if (!payload || payload.role !== 'HOD') return redirect('/login');
  
  const user = await prisma.user.findUnique({
    where: { id: payload.userId }
  });

  if (!user || !user.departmentId) return <div className="p-8 text-center">Department not found</div>;

  const items = await prisma.courseFeedback.findMany({ where: { classroom: { departmentId: user.departmentId } }, include: { classroom: { include: { subject: true, teacher: true } } } });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Data</CardTitle>
      </CardHeader>
      <CardContent>
        {(!items || (Array.isArray(items) && items.length === 0)) ? (
          <div className="py-8 text-center text-muted-foreground">No records found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Average Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(fb => (<TableRow key={fb.id}><TableCell className="font-bold">{fb.classroom?.subject?.name}</TableCell><TableCell>{fb.classroom?.teacher?.name}</TableCell><TableCell>{fb.rating}/5</TableCell></TableRow>))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted"></div>}>
        <DataList />
      </Suspense>
    </div>
  );
}

export const instant = false;
