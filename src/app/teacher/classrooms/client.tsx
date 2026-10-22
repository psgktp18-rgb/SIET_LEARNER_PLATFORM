'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { StatCards } from '@/components/ui/stat-cards';
import { FormDialog } from '@/components/ui/form-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { HealthScoreBadge } from '@/components/classroom/HealthScoreBadge';
import {
  BookOpen,
  Plus,
  Users,
  Copy,
  Check,
  Archive,
  ArrowRight,
  Clock,
  Sparkles,
  Shield,
  FileCheck,
  UserCheck,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface TeacherClassroomsClientProps {
  userId: string;
  myClasses: any[];
  extraClasses: any[];
  deptSubjects: any[];
  canCreateExtra: boolean;
  stats: {
    total: number;
    mainCount: number;
    coSubCount: number;
    totalStudents: number;
  };
}

export function TeacherClassroomsClient({
  userId,
  myClasses: initialMyClasses,
  extraClasses: initialExtraClasses,
  deptSubjects,
  canCreateExtra,
  stats,
}: TeacherClassroomsClientProps) {
  const router = useRouter();
  const [myClasses, setMyClasses] = useState<any[]>(initialMyClasses);
  const [extraClasses, setExtraClasses] = useState<any[]>(initialExtraClasses);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<any>(null);
  const [manageDrawerOpen, setManageDrawerOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteRegNo, setInviteRegNo] = useState('');
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const refreshClassroom = async (id: string) => {
    try {
      const res = await fetch(`/api/classrooms/${id}`);
      const data = await res.json();
      if (res.ok && data.classroom) {
        setManageTarget(data.classroom);
        setMyClasses(prev => prev.map(c => c.id === id ? { ...c, ...data.classroom } : c));
        setExtraClasses(prev => prev.map(c => c.id === id ? { ...c, ...data.classroom } : c));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Extra Class
  const handleCreateExtra = async (formData: FormData) => {
    try {
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EXTRA',
          name: formData.get('name'),
          subjectId: formData.get('subjectId'),
          category: formData.get('category'),
          requiresApproval: formData.get('requiresApproval') === 'on',
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg(`Extra class "${data.classroom.name}" created! (Teacher-created)`);
      setMyClasses(prev => [data.classroom, ...prev]);
      setExtraClasses(prev => [data.classroom, ...prev]);
      setCreateOpen(false);
      router.refresh();
    } catch (e: any) {
      showMsg(e.message, 'error');
      throw e;
    }
  };

  // Approve or Reject student join request
  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!manageTarget) return;
    try {
      const res = await fetch(`/api/classrooms/${manageTarget.id}/requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg(data.message);
      await refreshClassroom(manageTarget.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Invite student by Reg No
  const handleInviteStudent = async () => {
    if (!manageTarget || !inviteRegNo.trim()) return;
    try {
      const res = await fetch(`/api/classrooms/${manageTarget.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'individual', studentIdentifier: inviteRegNo.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg('Student enrolled successfully.');
      setInviteRegNo('');
      await refreshClassroom(manageTarget.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Archive extra class
  const handleToggleArchive = async () => {
    if (!manageTarget) return;
    try {
      const res = await fetch(`/api/classrooms/${manageTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !manageTarget.isArchived })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg(`Classroom ${data.classroom.isArchived ? 'archived' : 'unarchived'}.`);
      await refreshClassroom(manageTarget.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/student/classrooms?code=${code}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const renderClassCard = (cls: any) => {
    const isMain = cls.teacherId === userId;
    const subRecord = cls.teachers?.find((t: any) => t.teacherId === userId && t.role === 'SUBSTITUTE');
    const isSub = !!subRecord;
    const subExpired = isSub && subRecord.endDate && new Date(subRecord.endDate) < new Date();
    const isCo = !isMain && !isSub && cls.teachers?.some((t: any) => t.teacherId === userId && t.role === 'CO_TEACHER');

    return (
      <Card key={cls.id} className="border border-border/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <Badge variant={cls.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs font-semibold">
                  {cls.type === 'OFFICIAL' ? 'Official' : 'Teacher-created'}
                </Badge>
                {cls.category && (
                  <Badge variant="outline" className="text-2xs text-primary">
                    {cls.category}
                  </Badge>
                )}
                {isMain && (
                  <Badge variant="outline" className="text-2xs bg-primary/10 text-primary border-primary/20">
                    Main Teacher
                  </Badge>
                )}
                {isCo && (
                  <Badge variant="outline" className="text-2xs bg-blue-50 text-blue-700 border-blue-200">
                    Co-Teacher
                  </Badge>
                )}
                {isSub && (
                  <Badge variant={subExpired ? 'destructive' : 'warning'} className="text-2xs">
                    {subExpired
                      ? 'Substitute (Expired)'
                      : `Substitute until ${new Date(subRecord.endDate).toLocaleDateString()}`}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                {cls.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cls.subject?.name} ({cls.subject?.code}) · Year {cls.year} Sec {cls.section}
              </p>
            </div>
            {cls.health && (
              <HealthScoreBadge health={cls.health} size="sm" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <span className="text-muted-foreground block text-2xs">Enrolled</span>
              <span className="font-bold text-foreground">{cls.studentCount || cls._count?.enrollments || 0} students</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs">Join Code</span>
              <span className="font-mono font-bold text-primary">{cls.joinCode}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs">Pending Requests</span>
              <span className="font-bold text-foreground">
                {cls.joinRequests?.length || 0}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-2xs">Pending Grading</span>
              <span className="font-bold text-foreground">
                {cls.pendingGradingCount || 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                setManageTarget(cls);
                setManageDrawerOpen(true);
                refreshClassroom(cls.id);
              }}
            >
              <Users className="h-3.5 w-3.5 mr-1" /> Manage Class
            </Button>
            <Link href={`/teacher/classroom/${cls.id}`} className="block">
              <Button size="sm" className="w-full text-xs h-8 gap-1">
                <span>Enter</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="My Classrooms"
        description="View curriculum classrooms, extra remedial batches, assigned co-teaching roles, and student requests."
        actions={
          canCreateExtra && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Extra Class
            </Button>
          )
        }
      />

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Stat Cards */}
      <StatCards
        stats={[
          { label: 'Classes Handled', value: stats.total, icon: BookOpen },
          { label: 'Main Teacher', value: stats.mainCount, icon: Shield, badgeVariant: 'default' },
          { label: 'Co / Substitute', value: stats.coSubCount, icon: Clock, badgeVariant: 'outline' },
          { label: 'Total Students Taught', value: stats.totalStudents, icon: Users },
        ]}
      />

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="gap-2">
            <BookOpen className="h-4 w-4" />
            My Classes ({myClasses.length})
          </TabsTrigger>
          <TabsTrigger value="extra" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Extra Classes ({extraClasses.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: All Classes */}
        <TabsContent value="all" className="space-y-4">
          {myClasses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No classrooms assigned"
              description="You have not been assigned to any official classrooms yet, and have not created any extra classes."
              action={
                canCreateExtra
                  ? {
                      label: 'Create Extra Class',
                      onClick: () => setCreateOpen(true),
                      icon: Plus,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myClasses.map(renderClassCard)}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Extra Classes */}
        <TabsContent value="extra" className="space-y-4">
          {extraClasses.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No extra classes created"
              description="Create remedial classes, lab batches, revision groups, or project groups for your students."
              action={
                canCreateExtra
                  ? {
                      label: 'Create Extra Class',
                      onClick: () => setCreateOpen(true),
                      icon: Plus,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {extraClasses.map(renderClassCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Extra Class Modal */}
      <FormDialog
        title="Create Extra Class"
        description="Extra classes are marked 'Teacher-created' and restricted to subjects in your department."
        trigger={<span />}
        open={createOpen}
        onOpenChange={setCreateOpen}
        submitText="Create Class"
        onSubmit={handleCreateExtra}
      >
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Class Name *</Label>
            <Input name="name" placeholder="e.g. Remedial Data Structures Batch B" required />
          </div>

          <div className="grid gap-1.5">
            <Label>Subject (Own Department) *</Label>
            <select name="subjectId" required className="flex h-9 w-full rounded-md border text-sm px-3 bg-background">
              <option value="">Select Subject</option>
              {deptSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>Category *</Label>
            <select name="category" required defaultValue="REMEDIAL" className="flex h-9 w-full rounded-md border text-sm px-3 bg-background">
              <option value="REMEDIAL">Remedial Class</option>
              <option value="LAB_BATCH">Lab Batch</option>
              <option value="REVISION">Revision Group</option>
              <option value="PROJECT_GROUP">Project Group</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" name="requiresApproval" id="teacherReqApproval" className="rounded" />
            <Label htmlFor="teacherReqApproval" className="text-xs cursor-pointer">
              Require teacher approval when students join with code
            </Label>
          </div>
        </div>
      </FormDialog>

      {/* Manage Class Drawer */}
      <Sheet open={manageDrawerOpen} onOpenChange={setManageDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          {manageTarget && (
            <div className="space-y-6">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={manageTarget.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs">
                    {manageTarget.type}
                  </Badge>
                  {manageTarget.health && (
                    <HealthScoreBadge health={manageTarget.health} size="sm" />
                  )}
                </div>
                <SheetTitle className="text-xl font-bold">{manageTarget.name}</SheetTitle>
                <SheetDescription>
                  {manageTarget.subject?.name} · Year {manageTarget.year} Sec {manageTarget.section}
                </SheetDescription>
              </SheetHeader>

              {/* Join Code and Invite Link */}
              <div className="p-4 rounded-lg border bg-card space-y-3">
                <Label className="font-semibold text-sm">Classroom Code & Invite Link</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-muted rounded font-mono font-bold text-center text-sm text-primary tracking-wider">
                    {manageTarget.joinCode}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyCode(manageTarget.joinCode)}>
                    {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="sm" variant="secondary" className="w-full text-xs gap-1.5" onClick={() => copyLink(manageTarget.joinCode)}>
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Student Invite Link'}</span>
                </Button>
              </div>

              {/* Pending Join Requests */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">Pending Join Requests</Label>
                  <Badge variant={manageTarget.joinRequests?.length ? 'warning' : 'outline'} className="text-2xs">
                    {manageTarget.joinRequests?.length || 0} Pending
                  </Badge>
                </div>

                {manageTarget.joinRequests?.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 bg-muted/20 rounded border border-dashed text-center">
                    No pending student requests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {manageTarget.joinRequests?.map((req: any) => (
                      <div key={req.id} className="p-3 border rounded-lg bg-card flex items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-semibold">{req.student?.name}</p>
                          <span className="font-mono text-2xs text-muted-foreground">
                            {req.student?.loginId} · Year {req.student?.year} Sec {req.student?.section}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive h-7 px-2 text-xs"
                            onClick={() => handleProcessRequest(req.id, 'reject')}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs"
                            onClick={() => handleProcessRequest(req.id, 'approve')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite Students by Reg No */}
              {manageTarget.type === 'EXTRA' && manageTarget.teacherId === userId && (
                <div className="p-4 border rounded-lg bg-card space-y-2">
                  <Label className="font-semibold text-sm">Invite / Enroll Student</Label>
                  <p className="text-xs text-muted-foreground">Add student directly into this extra class by Reg No.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 714021104001"
                      value={inviteRegNo}
                      onChange={e => setInviteRegNo(e.target.value)}
                      className="text-xs"
                    />
                    <Button size="sm" onClick={handleInviteStudent} disabled={!inviteRegNo.trim()}>
                      Enroll
                    </Button>
                  </div>
                </div>
              )}

              {/* Co-Teachers & Class Rep */}
              <div className="p-4 border rounded-lg bg-card space-y-3">
                <Label className="font-semibold text-sm">Classroom Roles & Staff</Label>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-muted/40">
                    <span className="text-muted-foreground">Main Teacher:</span>
                    <span className="font-bold">{manageTarget.teacher?.name}</span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-muted/40">
                    <span className="text-muted-foreground">Class Representative:</span>
                    <span className="font-semibold">
                      {manageTarget.classRep ? (
                        <Badge variant="secondary" className="gap-1">
                          <UserCheck className="h-3 w-3" /> {manageTarget.classRep.name} ({manageTarget.classRep.loginId})
                        </Badge>
                      ) : (
                        'None designated'
                      )}
                    </span>
                  </div>

                  {manageTarget.teachers?.length > 0 && (
                    <div className="pt-2 border-t space-y-1.5">
                      <span className="text-2xs text-muted-foreground uppercase font-semibold">Assigned Co-Teachers</span>
                      {manageTarget.teachers.map((st: any) => (
                        <div key={st.id} className="flex justify-between items-center p-2 rounded bg-card border">
                          <span>{st.teacher?.name}</span>
                          <Badge variant="outline" className="text-2xs">
                            {st.role === 'CO_TEACHER' ? 'Co-Teacher' : 'Substitute'}
                          </Badge>
                        </div>
                      ))}
                      <p className="text-2xs text-muted-foreground italic">
                        * Co-teachers and substitutes are managed by your department HOD.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Archive Extra Class */}
              {manageTarget.type === 'EXTRA' && manageTarget.teacherId === userId && (
                <div className="p-4 border rounded-lg bg-card space-y-2">
                  <Label className="font-semibold text-sm">Class Status</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={handleToggleArchive}
                  >
                    <Archive className="h-4 w-4" />
                    {manageTarget.isArchived ? 'Unarchive This Extra Class' : 'Archive This Extra Class'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
