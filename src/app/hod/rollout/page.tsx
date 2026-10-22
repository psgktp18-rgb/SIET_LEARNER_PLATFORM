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

  const items = await prisma.systemSetting.findFirst();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollout Status Data</CardTitle>
      </CardHeader>
      <CardContent>
        {(!items || (Array.isArray(items) && items.length === 0)) ? (
          <div className="py-8 text-center text-muted-foreground">No records found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Self Registration</TableHead>
                <TableHead>Exam Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items ? <TableRow><TableCell className="font-bold">System Status</TableCell><TableCell>{items.allowSelfReg ? "Yes" : "No"}</TableCell><TableCell>{items.examMode ? "Enabled" : "Disabled"}</TableCell></TableRow> : null}
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
        <h1 className="text-3xl font-bold tracking-tight">Rollout Status</h1>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted"></div>}>
        <DataList />
      </Suspense>
    </div>
  );
}

export const instant = false;
