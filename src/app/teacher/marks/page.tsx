import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, ArrowRight, BookOpen } from 'lucide-react';

export const instant = false;

export default async function TeacherMarksSelectionPage() {
  const payload = await getUser();
  if (!payload) return redirect('/login');

  const classrooms = await prisma.classroom.findMany({
    where: {
      OR: [
        { teacherId: payload.userId },
        { teachers: { some: { teacherId: payload.userId } } }
      ],
      isArchived: false,
    },
    include: {
      subject: true,
      department: true,
      _count: { select: { enrollments: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const finalisedMarks = await prisma.finalisedSubjectMarks.findMany({
    where: { classroomId: { in: classrooms.map(c => c.id) } }
  });
  const finalisedIds = new Set(finalisedMarks.map(f => f.classroomId));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Marks & Performance Management
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select a classroom to evaluate internal test components, draft student marks, and submit for HOD finalisation.
        </p>
      </div>

      {classrooms.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-muted-foreground space-y-2">
          <Award className="h-8 w-8 mx-auto opacity-40 text-primary" />
          <p className="text-sm font-semibold text-foreground">No classrooms assigned</p>
          <p className="text-xs max-w-sm mx-auto">
            You currently have no active classrooms to grade. Classrooms assigned by your admin or created as extra batches will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((cls) => {
            const isFinalised = finalisedIds.has(cls.id);
            return (
              <Card key={cls.id} className="hover:shadow-md transition-shadow border flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={cls.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-3xs">
                      Year {cls.year} Sec {cls.section}
                    </Badge>
                    {isFinalised ? (
                      <Badge variant="outline" className="text-3xs text-green-700 bg-green-50 border-green-300">
                        Finalised
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-3xs bg-amber-100 text-amber-800">
                        Draft / Open
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base font-bold mt-2">{cls.name}</CardTitle>
                  <CardDescription className="text-xs text-primary font-medium">
                    {cls.subject.name} ({cls.subject.code})
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xs text-muted-foreground mb-4">
                    {cls._count.enrollments} Enrolled Students
                  </div>
                  <Button size="sm" render={<Link href={`/teacher/classroom/${cls.id}`} className="w-full text-xs font-semibold justify-between" />}>
                    <span>Manage Marks & Roster</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
