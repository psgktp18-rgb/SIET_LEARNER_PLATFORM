import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function DataList() {
  const payload = await getUser();
  if (!payload || payload.role !== 'TEACHER') return redirect('/login');
  
  const teacherId = payload.userId;

  const items = await prisma.doubtTicket.findMany({ where: { classroom: { teacherId } }, include: { student: true, classroom: true }, orderBy: { createdAt: "desc" } });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doubts Inbox Data</CardTitle>
      </CardHeader>
      <CardContent>
        {(!items || (Array.isArray(items) && items.length === 0)) ? (
          <div className="py-8 text-center text-muted-foreground">No records found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doubt</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(d => (<TableRow key={d.id}><TableCell className="font-bold">{d.question}</TableCell><TableCell>{d.student?.name}</TableCell><TableCell><Badge>{d.status}</Badge></TableCell></TableRow>))}
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
        <h1 className="text-3xl font-bold tracking-tight">Doubts Inbox</h1>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted"></div>}>
        <DataList />
      </Suspense>
    </div>
  );
}

export const instant = false;
