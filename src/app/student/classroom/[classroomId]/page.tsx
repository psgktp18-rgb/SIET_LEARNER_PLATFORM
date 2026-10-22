import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ClassroomStream } from '@/components/classroom/ClassroomStream';
import { UserCheck, ShieldCheck, Sparkles } from 'lucide-react';

export const instant = false;

export default async function StudentClassroomPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') {
    return <div className="p-8">Access Denied: Please log in as a student.</div>;
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { classroomId, userId: payload.userId },
    include: {
      classroom: {
        include: {
          subject: true,
          teacher: { select: { id: true, name: true, email: true } },
          classRep: { select: { id: true, name: true } },
          notes: { orderBy: { createdAt: 'desc' } },
          assignments: { orderBy: { createdAt: 'desc' } },
          announcements: {
            include: { author: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      }
    }
  });

  if (!enrollment) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You are not enrolled in this classroom.</p>
        <Link href="/student/classrooms" className="text-primary hover:underline font-medium inline-block text-sm">
          Return to My Classrooms
        </Link>
      </div>
    );
  }

  const cls = enrollment.classroom;
  const isClassRep = cls.classRepId === payload.userId;

  return (
    <div className="flex flex-col bg-background min-h-full">
      {/* Class Representative Banner if Designated */}
      {isClassRep && (
        <div className="bg-amber-100 border-b border-amber-300 px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0 text-amber-700" />
            <span>
              You are the designated <strong>Class Representative</strong> for this classroom. You have permission to post announcements and coordinate study groups.
            </span>
          </div>
          <Badge variant="secondary" className="bg-amber-200 text-amber-900 border-amber-400 text-2xs">
            Class Rep
          </Badge>
        </div>
      )}

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant={cls.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs font-semibold">
                {cls.type === 'OFFICIAL' ? 'Official Curriculum' : 'Extra Class'}
              </Badge>
              {cls.category && (
                <Badge variant="outline" className="text-2xs text-primary">
                  {cls.category}
                </Badge>
              )}
              {isClassRep && (
                <Badge variant="secondary" className="gap-1 text-2xs bg-amber-100 text-amber-800 border-amber-300">
                  <UserCheck className="h-3 w-3" /> Class Representative
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{cls.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cls.subject.name} ({cls.subject.code}) · Taught by <strong>{cls.teacher.name}</strong>
            </p>
          </div>
        </div>

        <Tabs defaultValue="stream" className="w-full">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="stream">Stream</TabsTrigger>
            <TabsTrigger value="notes">Notes & Materials ({cls.notes.length})</TabsTrigger>
            <TabsTrigger value="assignments">Assignments ({cls.assignments.length})</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="meet">Live Meet</TabsTrigger>
          </TabsList>

          <TabsContent value="stream" className="space-y-4">
            <ClassroomStream
              classroomId={cls.id}
              initialAnnouncements={cls.announcements}
              canPost={isClassRep}
              isClassRep={isClassRep}
              userRoleName={isClassRep ? 'Class Representative' : 'Student'}
            />
          </TabsContent>

          <TabsContent value="notes" className="p-4 border rounded-md bg-card">
            {cls.notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notes uploaded yet for this class.</p>
            ) : (
              <div className="space-y-2">
                {cls.notes.map(n => (
                  <div key={n.id} className="p-3 border rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-sm">{n.title}</p>
                      <span className="text-muted-foreground">{n.fileType} · {new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="p-4 border rounded-md bg-card">
            {cls.assignments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No assignments pending.</p>
            ) : (
              <div className="space-y-2">
                {cls.assignments.map(a => (
                  <div key={a.id} className="p-3 border rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-sm">{a.title}</p>
                      <span className="text-muted-foreground">Due: {new Date(a.dueDate).toLocaleDateString()} · Max: {a.maxMarks} marks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="p-4 border rounded-md text-muted-foreground bg-card text-xs">
            No quizzes available right now.
          </TabsContent>

          <TabsContent value="flashcards" className="p-4 border rounded-md text-muted-foreground bg-card text-xs">
            No flashcard decks generated yet.
          </TabsContent>

          <TabsContent value="tests" className="p-4 border rounded-md text-muted-foreground bg-card text-xs">
            No active class tests scheduled.
          </TabsContent>

          <TabsContent value="meet" className="p-4 border rounded-md text-muted-foreground bg-card text-xs">
            No live meetings currently in session.
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
