import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';


async function DataList() {
  const items = await prisma.systemSetting.findFirst();

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Configuration Data</CardTitle>
      </CardHeader>
      <CardContent>
        {(!items || (Array.isArray(items) && items.length === 0)) ? (
          <div className="py-8 text-center text-muted-foreground">No records found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Primary Provider</TableHead>
                <TableHead>Ollama Model</TableHead>
                <TableHead>Gemini Model</TableHead>
                <TableHead>Master Switch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items ? <TableRow><TableCell className="font-bold">{items.aiPrimaryProvider}</TableCell><TableCell>{items.ollamaChatModel}</TableCell><TableCell>{items.geminiModel}</TableCell><TableCell><Badge>{items.aiMasterSwitch ? "ON" : "OFF"}</Badge></TableCell></TableRow> : null}
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
        <h1 className="text-3xl font-bold tracking-tight">AI Configuration</h1>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted"></div>}>
        <DataList />
      </Suspense>
    </div>
  );
}

export const instant = false;
