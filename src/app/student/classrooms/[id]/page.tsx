import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClassroomStream } from '@/components/classroom/ClassroomStream';

export const instant = false;

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') return redirect('/login');

  const { id } = await params;

  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_classroomId: { userId: payload.userId, classroomId: id } }
  });

  if (!enrollment) return notFound();

  const [classroom, announcements] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id },
      include: { subject: true, teacher: true }
    }),
    prisma.announcement.findMany({
      where: { classroomId: id },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (!classroom) return notFound();

  const isClassRep = classroom.classRepId === payload.userId;
  const settings = await prisma.systemSetting.findFirst();
  const examMode = settings?.examMode ?? false;
  const aiDown = false; // Example flag for AI being down

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-primary text-primary-foreground p-6 rounded-lg shadow-md" style={{ backgroundColor: classroom.bannerColor }}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{classroom.name}</h1>
          <p className="mt-2 opacity-90">{classroom.subject.name} | {classroom.teacher.name}</p>
        </div>
      </div>

      <Tabs defaultValue="stream" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-2 p-2">
          <TabsTrigger value="stream">Stream</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          {!examMode && <TabsTrigger value="doubt-bot">Doubt Bot</TabsTrigger>}
          <TabsTrigger value="doubt-wall">Doubt Wall</TabsTrigger>
          <TabsTrigger value="meet">Meet</TabsTrigger>
          <TabsTrigger value="study-rooms">Study Rooms</TabsTrigger>
          {!examMode && <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>}
        </TabsList>

        <TabsContent value="stream" className="space-y-4 mt-4">
          <ClassroomStream
            classroomId={classroom.id}
            initialAnnouncements={announcements}
            canPost={isClassRep}
            isClassRep={isClassRep}
            userRoleName={isClassRep ? 'Class Representative' : 'Student'}
          />
        </TabsContent>

        <TabsContent value="notes" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Materials & Notes</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Button variant="outline">Upload Note</Button>
              </div>
              <div className="border rounded-md p-4 flex justify-between items-center">
                <span>Unit 1 Notes.pdf</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Preview</Button>
                  <Button size="sm" variant="outline">Download</Button>
                  <Button size="sm" variant="outline">Bookmark</Button>
                  <Button size="sm" variant="outline">Mark Studied</Button>
                  <Button size="sm" variant="outline">Summarise</Button>
                  <Button size="sm" variant="outline">Make Flashcards</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Assignments</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 flex justify-between items-center">
                <span>Assignment 1</span>
                <Button size="sm">Submit</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Practice Quizzes</CardTitle></CardHeader>
            <CardContent>
               <Button className="mb-4">Generate Practice Quiz</Button>
               <div className="border rounded-md p-4 flex justify-between items-center">
                <span>Quiz: Basics</span>
                <div className="flex gap-2">
                   <Button size="sm">Start</Button>
                   <Button size="sm" variant="outline">Results</Button>
                   <Button size="sm" variant="secondary">Retry Weak Topics</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="flashcards" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Flashcards</CardTitle></CardHeader>
            <CardContent><Button>Study Flashcards</Button></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Tests</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 flex justify-between items-center">
                <span>Mid Term</span>
                <Button size="sm">Start</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {!examMode && (
          <TabsContent value="doubt-bot" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>AI Doubt Bot</CardTitle></CardHeader>
              <CardContent>
                {aiDown ? (
                   <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>AI Temporarily Unavailable</AlertTitle>
                      <AlertDescription>The AI service is currently taking a break. Please check back later or notify your teacher.</AlertDescription>
                   </Alert>
                ) : (
                  <div className="h-64 border rounded-md p-4 flex flex-col justify-end bg-muted/20">
                     <p className="text-muted-foreground text-center mb-4">Hello! Ask me any doubt.</p>
                     <div className="flex gap-2">
                       <input className="flex-1 border rounded-md px-3" placeholder="Type your doubt..." />
                       <Button>Ask</Button>
                       <Button variant="outline">Language Toggle</Button>
                       <Button variant="secondary">Notify Teacher</Button>
                     </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="doubt-wall" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Doubt Wall</CardTitle></CardHeader>
            <CardContent><Button>Post Doubt</Button></CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="meet" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Live Meetings</CardTitle></CardHeader>
            <CardContent><Button>Join Meet</Button></CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="study-rooms" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Study Rooms</CardTitle></CardHeader>
            <CardContent><Button>Join Room</Button></CardContent>
          </Card>
        </TabsContent>

        {!examMode && (
          <TabsContent value="leaderboard" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Class Leaderboard</CardTitle></CardHeader>
              <CardContent>Leaderboard will appear here.</CardContent>
            </Card>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}
