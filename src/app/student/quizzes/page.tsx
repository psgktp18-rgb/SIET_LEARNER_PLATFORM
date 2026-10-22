import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function QuizzesPage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quizzes & Practice</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
         <Card>
            <CardHeader><CardTitle>New Practice Quiz</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm text-muted-foreground">Generate a new practice quiz from the question bank.</p>
               <Button>Generate Now</Button>
            </CardContent>
         </Card>
         <Card>
            <CardHeader><CardTitle>Important Questions Bank</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm text-muted-foreground">Access all PYQs and important questions.</p>
               <Button variant="outline">Browse Bank</Button>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Practice History</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-md p-4 flex justify-between items-center">
            <div>
              <p className="font-bold">Basic Algorithms (Generated)</p>
              <p className="text-sm text-muted-foreground">Score: 8/10</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">Review</Button>
              <Button size="sm" variant="secondary">Retry Weak Topics</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
