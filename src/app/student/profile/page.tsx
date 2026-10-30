import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Hash,
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  Flame,
  GraduationCap,
  Building2,
  ClipboardCheck,
} from 'lucide-react';

export const instant = false;

export default async function ProfilePage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      department: true,
      enrollments: {
        include: {
          classroom: {
            include: { subject: true },
          },
        },
        take: 10,
      },
    },
  });

  if (!user) redirect('/login');

  // Attendance stats
  const totalMeetings = await prisma.meeting.count({
    where: {
      classroomId: { in: user.enrollments.map((e) => e.classroomId) },
      status: 'COMPLETED',
    },
  });

  const attendedMeetings = await prisma.attendance.count({
    where: {
      studentId: payload.userId,
      meeting: { status: 'COMPLETED' },
    },
  });

  const attendancePercent =
    totalMeetings > 0 ? Math.round((attendedMeetings / totalMeetings) * 100) : 100;

  // Points / XP from PointLedger
  const pointsAgg = await prisma.pointLedger.aggregate({
    where: { userId: payload.userId },
    _sum: { points: true },
  });
  const totalPoints = pointsAgg._sum.points ?? 0;

  // Badges earned
  const userBadges = await prisma.userBadge.findMany({
    where: { userId: payload.userId },
    include: { badge: true },
    take: 6,
  });

  // Assignments submitted
  const submissionsCount = await prisma.submission.count({
    where: { studentId: payload.userId },
  });

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'ST';

  const statCards = [
    {
      icon: BookOpen,
      label: 'Enrolled Courses',
      value: user.enrollments.length,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      icon: ClipboardCheck,
      label: 'Attendance',
      value: `${attendancePercent}%`,
      color: attendancePercent >= 75 ? 'text-green-500' : 'text-red-500',
      bg: attendancePercent >= 75
        ? 'bg-green-50 dark:bg-green-950/30'
        : 'bg-red-50 dark:bg-red-950/30',
    },
    {
      icon: TrendingUp,
      label: 'Total XP Points',
      value: totalPoints,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      icon: Award,
      label: 'Assignments Submitted',
      value: submissionsCount,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
  ];

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your academic identity at SIET</p>
      </div>

      {/* Profile Hero Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary to-primary/60" />
        <CardContent className="pt-0 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-full bg-secondary text-primary font-bold text-2xl flex items-center justify-center border-4 border-background shadow-lg shrink-0">
              {initials}
            </div>
            <div className="flex-1 pb-1">
              <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="secondary" className="text-xs font-bold">
                  {user.role}
                </Badge>
                {user.year && (
                  <Badge variant="outline" className="text-xs">
                    Year {user.year}
                  </Badge>
                )}
                {user.section && (
                  <Badge variant="outline" className="text-xs">
                    Section {user.section}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className={`${s.bg} border-0`}>
            <CardContent className="p-4 flex flex-col gap-2">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Hash className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">Register No:</span>
              <span className="font-mono">{user.loginId || '—'}</span>
            </div>
            {user.email && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="font-medium text-foreground">Email:</span>
                <span className="truncate">{user.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">Department:</span>
              <span>{user.department?.name || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">Year:</span>
              <span>Year {user.year ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">Section:</span>
              <span>{user.section ?? '—'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Enrolled Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Enrolled Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No enrolled courses yet.
              </p>
            ) : (
              <div className="divide-y">
                {user.enrollments.map((e) => (
                  <div key={e.classroomId} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {e.classroom.subject.name}
                      </p>
                      <p className="text-2xs text-muted-foreground font-mono">
                        {e.classroom.subject.code}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-2xs">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" /> Attendance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Overall Attendance</span>
                <span
                  className={`font-bold ${attendancePercent >= 75 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {attendancePercent}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${attendancePercent >= 75 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${attendancePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-2xs text-muted-foreground mt-1">
                <span>{attendedMeetings} attended</span>
                <span>{totalMeetings} total classes</span>
              </div>
            </div>
          </div>
          {attendancePercent < 75 && (
            <p className="text-xs text-red-600 mt-3 bg-red-50 dark:bg-red-950/20 rounded-md p-2">
              ⚠️ Your attendance is below the 75% requirement. Please attend more classes to avoid detainment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
