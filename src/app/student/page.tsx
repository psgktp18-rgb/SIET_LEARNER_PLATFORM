import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Video,
  Award,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Flame,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { JoinClassroomDialog } from './client-components';

export const instant = false;

export default async function StudentDashboard() {
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') {
    redirect('/login');
  }

  const studentId = payload.userId;

  // 1. Fetch Enrolled Classrooms
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: studentId },
    include: {
      classroom: {
        include: { subject: true, teacher: { select: { id: true, name: true } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const classroomIds = enrollments.map((e) => e.classroomId);

  // 2. Attendance Stats & Predictor
  const settings = await prisma.systemSetting.findFirst();
  const threshold = settings?.attendanceThreshold || 75;

  const attendanceStats = await Promise.all(
    enrollments.map(async (en) => {
      const totalMeetings = await prisma.meeting.count({
        where: { classroomId: en.classroomId, status: 'COMPLETED' },
      });
      const attended = await prisma.attendance.count({
        where: {
          studentId,
          meeting: { classroomId: en.classroomId, status: 'COMPLETED' },
        },
      });

      const currentPercent = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 100;
      const canMiss = Math.floor((attended - (threshold / 100) * totalMeetings) / (threshold / 100));
      const mustAttend = Math.ceil(((threshold / 100) * totalMeetings - attended) / (1 - threshold / 100));

      return {
        classroomId: en.classroomId,
        subjectName: en.classroom.subject.name,
        subjectCode: en.classroom.subject.code,
        totalMeetings,
        attended,
        currentPercent,
        canMiss: canMiss > 0 ? canMiss : 0,
        mustAttend: currentPercent < threshold ? (mustAttend > 0 ? mustAttend : 1) : 0,
      };
    })
  );

  // 3. Live Meets
  const liveMeets = await prisma.meeting.findMany({
    where: { classroomId: { in: classroomIds }, status: 'LIVE' },
    include: { classroom: { include: { subject: true } } },
  });

  // 4. Deadlines & Tests (Today's Plan)
  const [upcomingAssignments, upcomingTests, dueCardsCount, nextExam, pointsAgg] = await Promise.all([
    prisma.assignment.findMany({
      where: { classroomId: { in: classroomIds }, dueDate: { gt: new Date() } },
      include: { classroom: { include: { subject: true } } },
      orderBy: { dueDate: 'asc' },
      take: 4,
    }),
    prisma.test.findMany({
      where: { classroomId: { in: classroomIds }, endTime: { gt: new Date() } },
      include: { classroom: { include: { subject: true } } },
      orderBy: { startTime: 'asc' },
      take: 3,
    }),
    prisma.flashcard.count({
      where: { creatorId: studentId, nextReview: { lte: new Date() } },
    }),
    prisma.exam.findFirst({
      where: { date: { gt: new Date() } },
      orderBy: { date: 'asc' },
    }),
    prisma.pointLedger.aggregate({
      where: { userId: studentId },
      _sum: { points: true },
    }),
  ]);

  const totalPoints = pointsAgg._sum.points || 0;

  // Exam Countdown calculation
  let examCountdownDays = null;
  if (nextExam) {
    const diffTime = Math.abs(new Date(nextExam.date).getTime() - new Date().getTime());
    examCountdownDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Welcome & Streak Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {payload.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Roll / Reg ID: <span className="font-mono font-semibold text-foreground">{payload.loginId}</span> · Sri Shakthi Institute of Engineering and Technology
          </p>
        </div>

        {/* Gamification Streak & Points */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-xs font-semibold">
            <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span>Active Learner</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-secondary/20 text-secondary border-secondary/40 text-xs font-bold">
            <Award className="h-4 w-4" />
            <span>{totalPoints} XP</span>
          </div>
        </div>
      </div>

      {/* Zero Classrooms: Main Cards are AI Tutor and Study Space */}
      {enrollments.length === 0 ? (
        <div className="space-y-6">
          <Card className="border-2 border-dashed border-primary/40 bg-card p-6 md:p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-secondary/30 text-primary flex items-center justify-center mx-auto">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              You are not enrolled in any classrooms yet
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Ask your faculty for a 6-character classroom join code, or begin studying right now using your private AI Tutor and personal Study Space!
            </p>
            <div className="pt-2">
              <JoinClassroomDialog />
            </div>
          </Card>

          {/* Hero Cards for AI Tutor & Study Space */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-primary/30 p-6 flex flex-col justify-between hover:shadow-md transition-shadow bg-card">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary text-secondary flex items-center justify-center font-bold">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">AI Study Tutor</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Ask questions, get step-by-step explanations, analogies, or learn in Tamil and Tanglish without needing any class notes.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t">
                <Button render={<Link href="/student/ai-tutor" className="w-full text-xs font-bold justify-between" />}>
                  <span>Start AI Tutor Session</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="border-2 border-primary/30 p-6 flex flex-col justify-between hover:shadow-md transition-shadow bg-card">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-secondary text-primary flex items-center justify-center font-bold">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Personal Study Space</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Upload your own lecture PDFs, generate auto-flashcards (SM-2 decks), test your viva skills, or run the Pomodoro timer.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t">
                <Button variant="outline" render={<Link href="/student/study" className="w-full text-xs font-bold justify-between" />}>
                  <span>Open Study Space</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* "Start Studying" Quick Action Bar */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/student/ai-tutor" className="block group">
            <Card className="p-4 border hover:border-primary transition-all group-hover:shadow-xs bg-card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary text-secondary flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Ask the AI Tutor</h4>
                  <p className="text-3xs text-muted-foreground">Step-by-step explanations & Tanglish</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/student/study" className="block group">
            <Card className="p-4 border hover:border-primary transition-all group-hover:shadow-xs bg-card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-secondary text-primary flex items-center justify-center font-bold shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Personal Study Space</h4>
                  <p className="text-3xs text-muted-foreground">Upload notes & make flashcards</p>
                </div>
              </div>
            </Card>
          </Link>

          <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
            <div>
              <h4 className="text-xs font-bold text-foreground">Join Another Class</h4>
              <p className="text-3xs text-muted-foreground">Enroll with a 6-char code</p>
            </div>
            <JoinClassroomDialog />
          </div>
        </div>
      )}

      {/* Live Meets Banner if any */}
      {liveMeets.length > 0 && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
            </span>
            <div>
              <p className="font-bold text-sm text-foreground">
                Live Classroom Session in Progress: {liveMeets[0].title}
              </p>
              <p className="text-xs text-muted-foreground">
                {liveMeets[0].classroom.name} ({liveMeets[0].classroom.subject.name})
              </p>
            </div>
          </div>
          <Button size="sm" render={<Link href={`/student/classroom/${liveMeets[0].classroom.id}`} className="bg-destructive hover:bg-destructive/90 text-white gap-1 text-xs" />}>
            <Video className="h-3.5 w-3.5" /> Join Live Meet
          </Button>
        </div>
      )}

      {/* Main 2-Column: Today's Plan + Exam Countdown & Attendance Predictor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Plan */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Today&apos;s Plan & Deadlines
            </h2>
            <Link href="/student/study" className="text-2xs text-primary hover:underline font-semibold">
              Study Hub & Pomodoro →
            </Link>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {upcomingAssignments.length === 0 && upcomingTests.length === 0 && dueCardsCount === 0 ? (
                <div className="py-8 text-center text-muted-foreground space-y-1">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 opacity-60" />
                  <p className="text-xs font-semibold text-foreground">You are all caught up!</p>
                  <p className="text-3xs">No urgent deadlines or pending tests for today.</p>
                </div>
              ) : (
                <div className="divide-y space-y-2">
                  {/* Due Flashcards */}
                  {dueCardsCount > 0 && (
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-secondary" />
                        <div>
                          <p className="font-semibold text-foreground">{dueCardsCount} Flashcards Due for Review</p>
                          <span className="text-3xs text-muted-foreground">Spaced repetition interval ready</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" render={<Link href="/student/flashcards" className="h-7 text-2xs" />}>
                        Review Now
                      </Button>
                    </div>
                  )}

                  {/* Upcoming Tests */}
                  {upcomingTests.map((t) => (
                    <div key={t.id} className="pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-destructive" />
                        <div>
                          <p className="font-semibold text-foreground">{t.title}</p>
                          <span className="text-3xs text-muted-foreground">
                            {t.classroom.subject.name} · Starts {new Date(t.startTime).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="destructive" render={<Link href="/student/tests" className="h-7 text-2xs" />}>
                        Take Test
                      </Button>
                    </div>
                  ))}

                  {/* Assignments */}
                  {upcomingAssignments.map((a) => (
                    <div key={a.id} className="pt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{a.title}</p>
                          <span className="text-3xs text-muted-foreground">
                            Due {new Date(a.dueDate).toLocaleDateString()} · Max {a.maxMarks} marks
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" render={<Link href={`/student/classroom/${a.classroomId}`} className="h-7 text-2xs" />}>
                        Submit Work
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Next Exam Countdown + Attendance Predictor */}
        <div className="space-y-4">
          {/* Next Exam Countdown Card */}
          <Card className="border-secondary/40 bg-secondary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> University Exams
                </CardTitle>
                <Badge variant="outline" className="text-3xs border-secondary text-primary font-bold">
                  Anna University
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {nextExam ? (
                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-foreground tracking-tight">
                    {examCountdownDays} <span className="text-sm font-normal text-muted-foreground">days left</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">{nextExam.title}</p>
                  <p className="text-3xs text-muted-foreground">
                    Scheduled for {new Date(nextExam.date).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  No university semester examinations scheduled by administrator yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Attendance Predictor Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Attendance Predictor</CardTitle>
                <Badge variant="outline" className="text-3xs">
                  Target: {threshold}%
                </Badge>
              </div>
              <CardDescription className="text-3xs">
                Predicts how many lectures you can miss or must attend to satisfy regulation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceStats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Enroll in classrooms to track course attendance.
                </p>
              ) : (
                <div className="divide-y space-y-2 text-xs">
                  {attendanceStats.slice(0, 4).map((att) => (
                    <div key={att.classroomId} className="pt-2 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground line-clamp-1">{att.subjectCode}</p>
                        <span className="text-3xs text-muted-foreground font-mono">
                          {att.attended} / {att.totalMeetings} sessions
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold font-mono ${
                            att.currentPercent >= threshold ? 'text-green-600' : 'text-destructive'
                          }`}
                        >
                          {att.currentPercent}%
                        </span>
                        <p className="text-3xs text-muted-foreground">
                          {att.currentPercent >= threshold
                            ? `Can miss ${att.canMiss}`
                            : `Must attend ${att.mustAttend}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enrolled Classrooms Grid */}
      {enrollments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> My Classrooms ({enrollments.length})
            </h2>
            <Link href="/student/classrooms" className="text-2xs text-primary hover:underline font-semibold">
              View All Classes →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map((en) => (
              <Card key={en.id} className="p-4 border hover:border-primary/60 transition-colors flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant={en.classroom.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-3xs">
                      {en.classroom.type}
                    </Badge>
                    <span className="text-3xs text-muted-foreground font-mono">
                      Sec {en.classroom.section}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground line-clamp-1">{en.classroom.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {en.classroom.subject.name} · {en.classroom.teacher.name}
                  </p>
                </div>
                <div className="pt-3 border-t mt-3 flex justify-between items-center">
                  <Link
                    href={`/student/classroom/${en.classroom.id}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Enter Classroom <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
