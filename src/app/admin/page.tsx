import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, Activity, TrendingUp, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const instant = false;

export default async function AdminDashboard() {
  // Core stats
  const [studentCount, teacherCount, hodCount, classroomCount, departmentCount, enrollmentCount] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
    prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
    prisma.user.count({ where: { role: 'HOD', isActive: true } }),
    prisma.classroom.count({ where: { isArchived: false } }),
    prisma.department.count(),
    prisma.enrollment.count(),
  ]);

  // Activity stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [activeToday, liveMeetings, pendingPasswordRequests, blockedUsers] = await Promise.all([
    prisma.user.count({ where: { lastLoginAt: { gte: today } } }),
    prisma.meeting.count({ where: { status: 'LIVE' } }),
    prisma.passwordResetRequest.count({ where: { status: 'PENDING' } }).catch(() => 0),
    prisma.user.count({ where: { isBlocked: true } }),
  ]);

  // Recent activity (last 5 logins)
  const recentLogins = await prisma.user.findMany({
    where: { lastLoginAt: { not: null } },
    orderBy: { lastLoginAt: 'desc' },
    take: 5,
    select: { name: true, role: true, loginId: true, lastLoginAt: true }
  });

  // Storage
  const storageResult = await prisma.fileRecord.aggregate({ _sum: { size: true } }).catch(() => ({ _sum: { size: 0 } }));
  const storageBytes = storageResult._sum.size || 0;
  const storageGB = (storageBytes / (1024 * 1024 * 1024)).toFixed(2);

  // Marks finalization status
  const totalClassrooms = classroomCount;
  const finalisedCount = await prisma.finalisedSubjectMarks.groupBy({ by: ['classroomId'] }).then(r => r.length).catch(() => 0);

  // Settings check for setup warnings
  const settings = await prisma.systemSetting.findFirst();
  const setupIssues: string[] = [];
  if (!settings?.academicYear) setupIssues.push('Academic year not configured');
  if (!settings?.aiPrimaryProvider) setupIssues.push('AI provider not configured');
  if (studentCount === 0) setupIssues.push('No students imported yet');
  if (enrollmentCount === 0) setupIssues.push('No students enrolled in classrooms');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {settings?.collegeName || 'Lecture Lens'} — {settings?.academicYear || 'Academic year not set'}
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          System Settings
        </Link>
      </div>

      {/* Setup warnings */}
      {setupIssues.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800">Setup Incomplete</span>
            <Link href="/admin/settings" className="ml-auto text-sm text-yellow-700 underline">Fix now →</Link>
          </div>
          <ul className="space-y-1">
            {setupIssues.map((issue, i) => (
              <li key={i} className="text-sm text-yellow-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/students">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              <GraduationCap className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{studentCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{enrollmentCount} enrollments</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/teachers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Teachers & HODs</CardTitle>
              <Users className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teacherCount + hodCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{hodCount} HODs, {teacherCount} teachers</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/classrooms">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Classrooms</CardTitle>
              <BookOpen className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalClassrooms}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {finalisedCount}/{totalClassrooms} marks finalised
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Today</CardTitle>
            <Activity className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {liveMeetings > 0 ? `${liveMeetings} live meeting${liveMeetings > 1 ? 's' : ''}` : 'No live meetings'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentCount}</div>
          </CardContent>
        </Card>

        <Link href="/admin/password-requests">
          <Card className={`hover:shadow-md transition-shadow cursor-pointer ${pendingPasswordRequests > 0 ? 'border-red-200 bg-red-50' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${pendingPasswordRequests > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                <Clock className="h-4 w-4" /> Password Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${pendingPasswordRequests > 0 ? 'text-red-700' : ''}`}>
                {pendingPasswordRequests}
              </div>
              <p className="text-xs text-muted-foreground mt-1">pending requests</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/blocked">
          <Card className={`hover:shadow-md transition-shadow cursor-pointer ${blockedUsers > 0 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${blockedUsers > 0 ? 'text-yellow-700' : 'text-muted-foreground'}`}>
                <AlertCircle className="h-4 w-4" /> Blocked Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${blockedUsers > 0 ? 'text-yellow-700' : ''}`}>
                {blockedUsers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">accounts blocked</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Logins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Logins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent logins.</p>
            ) : (
              <div className="space-y-3">
                {recentLogins.map((user, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({user.loginId})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                        user.role === 'HOD' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>{user.role}</span>
                      <span className="text-muted-foreground text-xs">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Import / Manage Students', href: '/admin/students', color: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200' },
              { label: 'Import / Manage Teachers', href: '/admin/teachers', color: 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200' },
              { label: 'Create Classrooms', href: '/admin/classrooms', color: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200' },
              { label: 'Manage Departments', href: '/admin/departments', color: 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200' },
              { label: 'Rollout Settings', href: '/admin/rollout', color: 'bg-pink-50 hover:bg-pink-100 text-pink-800 border-pink-200' },
              { label: 'System Settings', href: '/admin/settings', color: 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200' },
            ].map(action => (
              <Link
                key={action.href}
                href={action.href}
                className={`block w-full rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${action.color}`}
              >
                {action.label} →
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Storage info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Storage Usage</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="text-2xl font-bold">{storageGB} GB</div>
          <p className="text-sm text-muted-foreground">total file storage used across all classrooms</p>
        </CardContent>
      </Card>
    </div>
  );
}
