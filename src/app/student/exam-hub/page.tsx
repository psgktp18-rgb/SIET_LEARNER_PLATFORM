import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch'; // Needs to exist or I can use an input
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ExamHubPage() {
  const aiDown = false; // Example flag for AI down

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Exam Hub</h1>
        <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
           <input type="checkbox" id="low-data" className="w-4 h-4 accent-primary" />
           <Label htmlFor="low-data" className="cursor-pointer">Low-Data Mode</Label>
        </div>
      </div>
      
      <Tabs defaultValue="countdown" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-2 p-2">
          <TabsTrigger value="countdown">Countdown</TabsTrigger>
          <TabsTrigger value="planner">Study Planner</TabsTrigger>
          <TabsTrigger value="weak-topics">Weak Topics</TabsTrigger>
          <TabsTrigger value="ai-tools">AI Revision Tools</TabsTrigger>
          <TabsTrigger value="last-night">Last-Night Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="countdown" className="mt-4">
          <Card><CardHeader><CardTitle>Exam Countdown</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold text-primary">15 Days</p><p className="text-muted-foreground mt-2">until End Semester Exams</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="planner" className="mt-4">
          <Card><CardHeader><CardTitle>Study Planner</CardTitle></CardHeader><CardContent><Button>Generate AI Study Plan</Button></CardContent></Card>
        </TabsContent>

        <TabsContent value="weak-topics" className="mt-4">
          <Card><CardHeader><CardTitle>Weak Topics Analysis</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Not enough data to determine weak topics. Take more tests!</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="ai-tools" className="mt-4">
          <Card>
             <CardHeader><CardTitle>AI Revision Tools</CardTitle></CardHeader>
             <CardContent>
               {aiDown ? (
                   <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>AI Temporarily Unavailable</AlertTitle>
                      <AlertDescription>The AI service is currently taking a break. Please check back later.</AlertDescription>
                   </Alert>
                ) : (
                   <Button>Summarize entire syllabus</Button>
                )}
             </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="last-night" className="mt-4">
          <Card className="border-red-400 bg-red-50"><CardHeader><CardTitle className="text-red-800">Last-Night Revision Mode</CardTitle></CardHeader><CardContent><p className="text-red-700 font-bold mb-4">Focus only on high-yield topics and top 50 PYQs.</p><Button className="bg-red-600 hover:bg-red-700">Activate Now</Button></CardContent></Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
