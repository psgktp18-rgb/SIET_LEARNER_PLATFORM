import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  PlusCircle,
  GraduationCap,
} from 'lucide-react';
import { calculateClassroomHealth } from '@/lib/classroom-health';
import { HealthScoreBadge } from '@/components/classroom/HealthScoreBadge';

export const instant = false;

export default async function HodDashboard() {
  const payload = await getUser();
  if (!payload || (!payload.isHod && payload.role !== 'HOD' && payload.role !== 'ADMIN')) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { department: true },
  });

  if (!user || !user.departmentId) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-3">
        <h2 className="text-xl font-bold">No Department Assigned</h2>
        <p className="text-sm text-muted-foreground">
          Please contact the administrator to assign your faculty account to a department.
        </p>
      </div>
    );
  }

  const departmentId = user.departmentId;

  // 1. Fetch Department Classrooms
  const classrooms = await prisma.classroom.findMany({
    where: { departmentId, isArchived: false },
    include: {
      subject: true,
      teacher: true,
      _count: { select: { enrollments: true, notes: true, assignments: true } },
    },
    orderBy: [{ year: 'asc' }, { section: 'asc' }],
  });

  // 2. Department Metrics
  const [facultyCount, studentsCount, finalisedMarks] = await Promise.all([
    prisma.user.count({ where: { departmentId, role: 'TEACHER' } }),
    prisma.user.count({ where: { departmentId, role: 'STUDENT' } }),
    prisma.finalisedSubjectMarks.findMany({
      where: { classroom: { departmentId } },
    }),
  ]);

  const finalisedCount = finalisedMarks.length;
  const pendingCount = classrooms.length - finalisedCount;
  const finalisedClassroomIds = new Set(finalisedMarks.map((f) => f.classroomId));

  // 3. Health scores for classrooms
  const healthScores = await Promise.all(
    classrooms.slice(0, 6).map(async (c) => {
      const score = await calculateClassroomHealth(c.id);
      return { classroomId: c.id, score };
    })
  );
  const healthMap = new Map(healthScores.map((h) => [h.classroomId, h.score]));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-2xs font-bold text-primary border-primary">
              {user.department?.code} Department Head
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {user.department?.name} Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Academic administration, syllabus tracking, and faculty marks coordination.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button render={<Link href="/hod/classrooms" className="gap-1.5" />}>
            <BookOpen className="h-4 w-4" />
            <span>Department Classrooms</span>
          </Button>
          <Button variant="outline" render={<Link href="/hod/teachers" className="gap-1.5" />}>
            <Users className="h-4 w-4" />
            <span>Faculty Roster</span>
          </Button>
        </div>
      </div>

      {/* Real Department Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-l-4 border-l-primary">
          <p className="text-3xs uppercase font-semibold text-muted-foreground">Classrooms</p>
          <p className="text-2xl font-bold text-foreground mt-1">{classrooms.length}</p>
          <span className="text-3xs text-muted-foreground">Across curriculum & extra batches</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-600">
          <p className="text-3xs uppercase font-semibold text-muted-foreground">Faculty Members</p>
          <p className="text-2xl font-bold text-foreground mt-1">{facultyCount}</p>
          <span className="text-3xs text-muted-foreground">Assigned teaching staff</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-3xs uppercase font-semibold text-muted-foreground">Enrolled Students</p>
          <p className="text-2xl font-bold text-foreground mt-1">{studentsCount}</p>
          <span className="text-3xs text-muted-foreground">Department cohort</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-600">
          <p className="text-3xs uppercase font-semibold text-muted-foreground">Marks Finalised</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {finalisedCount} / {classrooms.length}
          </p>
          <span className="text-3xs text-muted-foreground">{pendingCount} pending finalisation</span>
        </Card>
      </div>

      {/* AI Weekly Digest Card */}
      <Card className="border-secondary/40 bg-secondary/5 overflow-hidden">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-secondary text-primary flex items-center justify-center font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                AI Department Weekly Digest
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Synthesize whole-department attendance velocity, syllabus coverage pace across teachers, and at-risk student intervention recommendations from live data.
            </p>
          </div>

          <Button render={<Link href="/hod/ai-insights" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs shrink-0" />}>
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            <span>Generate Department Digest</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Classrooms List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Department Classrooms ({classrooms.length})
          </h2>
          <Link href="/hod/classrooms" className="text-2xs text-primary hover:underline font-semibold">
            View All Classrooms →
          </Link>
        </div>

        {classrooms.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-muted-foreground space-y-2">
            <BookOpen className="h-8 w-8 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-semibold text-foreground">No classrooms created yet</p>
            <p className="text-xs max-w-md mx-auto">
              Your department does not have any active classrooms. Request official curriculum classes or create extra classes.
            </p>
            <div className="pt-2">
              <Button size="sm" render={<Link href="/hod/classrooms" className="text-xs gap-1" />}>
                <PlusCircle className="h-3.5 w-3.5" /> Request or Create Classrooms
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => {
              const health = healthMap.get(c.id);
              const isFinalised = finalisedClassroomIds.has(c.id);
              return (
                <Card key={c.id} className="p-4 border hover:border-primary/60 transition-colors flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={c.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-3xs">
                        Year {c.year} · Sec {c.section}
                      </Badge>
                      {health && <HealthScoreBadge health={health} size="sm" />}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">{c.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {c.subject.name} ({c.subject.code})
                      </p>
                      <p className="text-2xs text-muted-foreground mt-0.5">
                        Teacher: <strong>{c.teacher.name}</strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-2xs">
                      <span className="text-muted-foreground font-mono">{c._count.enrollments} Students</span>
                      {isFinalised ? (
                        <Badge variant="outline" className="text-3xs text-green-700 bg-green-50 border-green-300">
                          Marks Finalised
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-3xs bg-amber-100 text-amber-800">
                          Marks Pending
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t mt-3 flex justify-between items-center">
                    <Link
                      href={`/hod/classrooms`}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Manage Class Details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
