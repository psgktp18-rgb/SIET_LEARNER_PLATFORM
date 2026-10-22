import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';

async function DataList() {
  const items = await prisma.subjectMarksScheme.findMany({ include: { subject: true } });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marks & Schemes Data</CardTitle>
      </CardHeader>
      <CardContent>
        {(!items || (Array.isArray(items) && items.length === 0)) ? (
          <div className="py-8 text-center text-muted-foreground">No records found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Total Marks</TableHead>
                
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(sch => (<TableRow key={sch.id}><TableCell className="font-bold">{sch.subject?.name}</TableCell><TableCell>{sch.totalMaxMarks}</TableCell></TableRow>))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Marks & Schemes</h1>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted"></div>}>
        <DataList />
      </Suspense>
    </div>
  );
}

export const instant = false;
