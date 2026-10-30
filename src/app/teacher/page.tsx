import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Sparkles,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Video,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { calculateClassroomHealth } from '@/lib/classroom-health';
import { HealthScoreBadge } from '@/components/classroom/HealthScoreBadge';

export const instant = false;

export default async function TeacherDashboard() {
  const payload = await getUser();
  if (!payload) redirect('/login');

  const teacherId = payload.userId;

  // 1. Fetch Teacher's Classrooms
  const classrooms = await prisma.classroom.findMany({
    where: {
      OR: [
        { teacherId },
        { teachers: { some: { teacherId } } }
      ],
      isArchived: false,
    },
    include: {
      subject: true,
      department: true,
      _count: { select: { enrollments: true, notes: true, assignments: true } }
    },
    orderBy: { createdAt: 'desc' },
  });

  const classroomIds = classrooms.map((c) => c.id);

  // 2. Today's Classes (Timetable / Meetings)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayMeetings = await prisma.meeting.findMany({
    where: {
      classroomId: { in: classroomIds },
      scheduledFor: { gte: startOfDay, lte: endOfDay }
    },
    include: { classroom: { include: { subject: true } } },
    orderBy: { scheduledFor: 'asc' }
  });

  // 3. Needs Attention Metrics
  const [
    ungradedCount,
    openDoubtsCount,
    pendingJoinRequestsCount,
    finalisedMarksList,
    totalNotesCount,
    totalAssignmentsCount,
    attendanceCount,
    aiGenerationsCount,
  ] = await Promise.all([
    prisma.submission.count({
      where: {
        assignment: { classroomId: { in: classroomIds } },
        status: 'SUBMITTED',
      },
    }),
    prisma.doubtTicket.count({
      where: {
        classroomId: { in: classroomIds },
        status: 'OPEN',
      },
    }),
    prisma.classroomJoinRequest.count({
      where: {
        classroomId: { in: classroomIds },
        status: 'PENDING',
      },
    }),
    prisma.finalisedSubjectMarks.findMany({
      where: { classroomId: { in: classroomIds } },
    }),
    prisma.note.count({ where: { uploaderId: teacherId } }),
    prisma.assignment.count({ where: { teacherId } }),
    prisma.attendance.count({ where: { meeting: { classroomId: { in: classroomIds } } } }),
    prisma.aiGeneration.count({ where: { userId: teacherId } }),
  ]);

  const finalisedClassroomIds = new Set(finalisedMarksList.map((f) => f.classroomId));
  const unfinalisedMarksCount = classrooms.filter((c) => !finalisedClassroomIds.has(c.id)).length;

  // 4. Setup Checklist (100% DB Driven)
  const checklist = [
    { title: 'Create or join a classroom', done: classrooms.length > 0, href: '/teacher/classrooms' },
    { title: 'Upload learning materials / notes', done: totalNotesCount > 0, href: '/teacher/classrooms' },
    { title: 'Create your first assignment', done: totalAssignmentsCount > 0, href: '/teacher/classrooms' },
    { title: 'Record attendance in class', done: attendanceCount > 0, href: '/teacher/class-time' },
    { title: 'Try the AI Studio generator', done: aiGenerationsCount > 0, href: '/teacher/ai-studio' },
  ];

  const completedSteps = checklist.filter((c) => c.done).length;
  const progressPercent = Math.round((completedSteps / checklist.length) * 100);

  // Health scores for classrooms
  const healthScores = await Promise.all(
    classrooms.slice(0, 6).map(async (c) => {
      const score = await calculateClassroomHealth(c.id);
      return { classroomId: c.id, score };
    })
  );
  const healthMap = new Map(healthScores.map((h) => [h.classroomId, h.score]));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Greeting & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Faculty Workspace · {payload.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sri Shakthi Institute of Engineering and Technology · Teaching Portal
          </p>
        </div>

        {/* Big Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button nativeButton={false} render={<Link href="/teacher/classrooms" className="gap-2" />}>
            <PlusCircle className="h-4 w-4" />
            <span>Create Extra Class</span>
          </Button>

          <Button nativeButton={false} variant="outline" render={<Link href="/teacher/classrooms" className="gap-2" />}>
            <BookOpen className="h-4 w-4" />
            <span>Upload Notes</span>
          </Button>

          <Button nativeButton={false} variant="outline" render={<Link href="/teacher/classrooms" className="gap-2" />}>
            <FileText className="h-4 w-4" />
            <span>Create Assignment</span>
          </Button>

          <Button nativeButton={false} variant="secondary" render={<Link href="/teacher/ai-studio" className="gap-2 bg-secondary text-primary font-bold hover:bg-secondary/90" />}>
            <Sparkles className="h-4 w-4" />
            <span>Open AI Studio</span>
          </Button>
        </div>
      </div>

      {/* Zero Classrooms Hero Callout */}
      {classrooms.length === 0 && (
        <Card className="border-2 border-dashed border-primary/40 bg-card overflow-hidden shadow-xs">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="space-y-2 max-w-xl text-center md:text-left">
              <Badge variant="outline" className="text-2xs text-primary border-primary">
                New Faculty Onboarding
              </Badge>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                You haven&apos;t been assigned any classrooms yet
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You can create self-managed extra classes (remedial batches or clubs) right now, or request your official curriculum courses from your Admin / HOD.
              </p>
              <div className="flex flex-wrap gap-3 pt-2 justify-center md:justify-start">
                <Button nativeButton={false} render={<Link href="/teacher/classrooms" className="gap-1.5" />}>
                  <PlusCircle className="h-4 w-4" />
                  <span>Create an Extra Class</span>
                </Button>
                <div className="px-3 py-2 rounded-md bg-muted/50 border text-xs text-muted-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Admin is preparing your official timetable</span>
                </div>
              </div>
            </div>

            {/* AI Studio Works Without Classrooms Highlight */}
            <Card className="bg-primary text-primary-foreground border-none p-5 shrink-0 max-w-sm w-full shadow-md">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-secondary text-primary flex items-center justify-center font-bold">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-secondary">AI Studio Ready</h3>
                    <p className="text-3xs text-primary-foreground/80">Works with zero classrooms</p>
                  </div>
                </div>
                <p className="text-xs text-primary-foreground/90 leading-relaxed">
                  Draft lesson plans, build university exam papers, create rubrics, and generate quizzes right now before term begins.
                </p>
                <Button variant="secondary" render={<Link href="/teacher/ai-studio" className="w-full text-xs font-bold justify-between" />}>
                  <span>Explore AI Studio Tools</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Needs Your Attention Grid */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Needs Your Attention
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/teacher/classrooms" className="block group">
            <Card className="p-4 border hover:border-primary/50 transition-colors group-hover:shadow-xs">
              <p className="text-3xs uppercase font-semibold text-muted-foreground">Ungraded Submissions</p>
              <p className="text-2xl font-bold text-foreground mt-1">{ungradedCount}</p>
              <span className="text-3xs text-muted-foreground group-hover:text-primary flex items-center gap-1 mt-1">
                Grade submissions <ArrowRight className="h-3 w-3" />
              </span>
            </Card>
          </Link>

          <Link href="/teacher/doubts" className="block group">
            <Card className="p-4 border hover:border-primary/50 transition-colors group-hover:shadow-xs">
              <p className="text-3xs uppercase font-semibold text-muted-foreground">Open Doubt Tickets</p>
              <p className="text-2xl font-bold text-foreground mt-1">{openDoubtsCount}</p>
              <span className="text-3xs text-muted-foreground group-hover:text-primary flex items-center gap-1 mt-1">
                Answer doubts <ArrowRight className="h-3 w-3" />
              </span>
            </Card>
          </Link>

          <Link href="/teacher/classrooms" className="block group">
            <Card className="p-4 border hover:border-primary/50 transition-colors group-hover:shadow-xs">
              <p className="text-3xs uppercase font-semibold text-muted-foreground">Join Requests</p>
              <p className="text-2xl font-bold text-foreground mt-1">{pendingJoinRequestsCount}</p>
              <span className="text-3xs text-muted-foreground group-hover:text-primary flex items-center gap-1 mt-1">
                Review queue <ArrowRight className="h-3 w-3" />
              </span>
            </Card>
          </Link>

          <Link href="/teacher/marks" className="block group">
            <Card className="p-4 border hover:border-primary/50 transition-colors group-hover:shadow-xs">
              <p className="text-3xs uppercase font-semibold text-muted-foreground">Unfinalised Marks</p>
              <p className="text-2xl font-bold text-foreground mt-1">{unfinalisedMarksCount}</p>
              <span className="text-3xs text-muted-foreground group-hover:text-primary flex items-center gap-1 mt-1">
                Marks grid <ArrowRight className="h-3 w-3" />
              </span>
            </Card>
          </Link>
        </div>
      </div>

      {/* Main 2-Column: Today's Classes + Setup Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Classes */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Today&apos;s Lectures & Meetings
            </h2>
            <Link href="/teacher/timetable" className="text-2xs text-primary hover:underline font-semibold">
              Full Timetable →
            </Link>
          </div>

          {todayMeetings.length > 0 ? (
            <div className="space-y-2.5">
              {todayMeetings.map((m) => (
                <Card key={m.id} className="p-4 border hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-2xs font-mono">
                          {m.scheduledFor ? new Date(m.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                        </Badge>
                        <h3 className="font-bold text-sm text-foreground">{m.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {m.classroom.name} · {m.classroom.subject.name}
                      </p>
                    </div>

                    <Button size="sm" render={<Link href={`/teacher/classroom/${m.classroom.id}`} className="gap-1.5 text-xs" />}>
                      <Video className="h-3.5 w-3.5" />
                      <span>Start Session</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed p-6 text-center text-muted-foreground space-y-2">
              <Calendar className="h-8 w-8 mx-auto opacity-40 text-primary" />
              <p className="text-sm font-semibold text-foreground">No sessions scheduled for today</p>
              <p className="text-xs max-w-sm mx-auto">
                No active live lectures or class meetings currently planned on your schedule today.
              </p>
              <div className="pt-2">
                <Button size="sm" variant="outline" render={<Link href="/teacher/class-time" className="text-xs" />}>
                  Launch Instant Class-Time Session
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Real Data Setup Checklist */}
        <div className="space-y-3">
          <Card className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Course Setup Progress</CardTitle>
                <span className="text-xs font-bold text-primary">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {checklist.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/40 shrink-0" />
                    )}
                    <span className={item.done ? 'line-through text-muted-foreground' : 'font-medium text-foreground'}>
                      {item.title}
                    </span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Classrooms Section */}
      {classrooms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Active Classrooms ({classrooms.length})
            </h2>
            <Link href="/teacher/classrooms" className="text-2xs text-primary hover:underline font-semibold">
              Manage All Classrooms →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.slice(0, 6).map((cls) => {
              const health = healthMap.get(cls.id);
              return (
                <Card key={cls.id} className="p-4 border hover:border-primary/60 transition-colors flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={cls.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-3xs">
                        {cls.type}
                      </Badge>
                      {health && <HealthScoreBadge health={health} size="sm" />}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">{cls.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {cls.subject.name} · Year {cls.year} Sec {cls.section}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-3xs text-muted-foreground font-mono pt-1">
                      <span>{cls._count.enrollments} Students</span>
                      <span>·</span>
                      <span>{cls._count.notes} Notes</span>
                      <span>·</span>
                      <span>Code: {cls.joinCode}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t mt-3 flex justify-between items-center">
                    <Link
                      href={`/teacher/classroom/${cls.id}`}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Open Classroom <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
