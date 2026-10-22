import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AttendancePage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <Button className="bg-primary">QR Scan Attendance</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
            <CardHeader><CardTitle>Attendance Heat-map</CardTitle></CardHeader>
            <CardContent>
               <div className="h-48 bg-muted flex items-center justify-center rounded-md border">
                  Calendar Heat-map (Coming Soon)
               </div>
            </CardContent>
         </Card>
         
         <Card>
            <CardHeader><CardTitle>Predictor</CardTitle></CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground mb-4">You have 82% overall attendance. You can miss 3 more classes and stay above 75%.</p>
               <Button variant="outline">Detailed Predictor</Button>
            </CardContent>
         </Card>
      </div>

      <Card>
         <CardHeader><CardTitle>Subject %</CardTitle></CardHeader>
         <CardContent>
            <Table>
               <TableHeader>
                  <TableRow><TableHead>Subject</TableHead><TableHead>Percentage</TableHead></TableRow>
               </TableHeader>
               <TableBody>
                  <TableRow><TableCell>CSE101</TableCell><TableCell>85%</TableCell></TableRow>
                  <TableRow><TableCell>ECE201</TableCell><TableCell>79%</TableCell></TableRow>
               </TableBody>
            </Table>
         </CardContent>
      </Card>
    </div>
  );
}
