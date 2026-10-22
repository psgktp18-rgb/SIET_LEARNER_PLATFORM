import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';

async function DataList() {
  const items = await prisma.aiUsageLog.findMany({ take: 25, orderBy: { timestamp: "desc" },  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics & Usage Data</CardTitle>
      </CardHeader>
      <CardContent>
        {(!items || (Array.isArray(items) && items.length === 0)) ? (
          <div className="py-8 text-center text-muted-foreground">No records found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Tokens Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(log => (<TableRow key={log.id}><TableCell className="font-bold">{log.taskType}</TableCell><TableCell>{log.model}</TableCell><TableCell>{log.provider}</TableCell><TableCell>{log.success ? "Yes" : "No"}</TableCell></TableRow>))}
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
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Usage</h1>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted"></div>}>
        <DataList />
      </Suspense>
    </div>
  );
}

export const instant = false;
