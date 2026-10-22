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
  GraduationCap,
  Sparkles,
  UserCheck,
  UserPlus,
  Clock,
  ArrowRight,
  Eye,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

interface HodClassroomsClientProps {
  department: any;
  classrooms: any[];
  deptSubjects: any[];
  deptTeachers: any[];
  requests: any[];
  stats: {
    total: number;
    official: number;
    extra: number;
    totalStudents: number;
    avgHealth: number;
  };
}

export function HodClassroomsClient({
  department,
  classrooms: initialClassrooms,
  deptSubjects,
  deptTeachers,
  requests: initialRequests,
  stats,
}: HodClassroomsClientProps) {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<any[]>(initialClassrooms);
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals & Drawers
  const [reqClassOpen, setReqClassOpen] = useState(false);
  const [createExtraOpen, setCreateExtraOpen] = useState(false);
  const [changeTeacherTarget, setChangeTeacherTarget] = useState<any>(null);
  const [changeTeacherOpen, setChangeTeacherOpen] = useState(false);

  // Staff Drawer
  const [staffTarget, setStaffTarget] = useState<any>(null);
  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false);
  const [staffTeacherId, setStaffTeacherId] = useState('');
  const [staffRole, setStaffRole] = useState<'CO_TEACHER' | 'SUBSTITUTE'>('CO_TEACHER');
  const [staffEndDate, setStaffEndDate] = useState('');

  // Read-only classroom detail drawer
  const [readDetailClass, setReadDetailClass] = useState<any>(null);
  const [readDetailOpen, setReadDetailOpen] = useState(false);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const refreshClassroom = async (id: string) => {
    try {
      const res = await fetch(`/api/classrooms/${id}`);
      const data = await res.json();
      if (res.ok && data.classroom) {
        setStaffTarget(data.classroom);
        setClassrooms(prev => prev.map(c => c.id === id ? { ...c, ...data.classroom } : c));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Group classrooms by Year and Section
  const groupedClassrooms: Record<string, any[]> = {};
  for (const c of classrooms) {
    const key = `Year ${c.year} · Section ${c.section}`;
    if (!groupedClassrooms[key]) groupedClassrooms[key] = [];
    groupedClassrooms[key].push(c);
  }

  // 1. Request Official Classroom (Admin approves)
  const handleRequestOfficial = async (formData: FormData) => {
    try {
      const res = await fetch('/api/classrooms/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CREATE_OFFICIAL',
          subjectId: formData.get('subjectId'),
          year: parseInt(formData.get('year') as string),
          section: formData.get('section'),
          proposedTeacherId: formData.get('proposedTeacherId'),
          reason: formData.get('reason'),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg('Request submitted for Admin approval.');
      setRequests(prev => [data.request, ...prev]);
      setReqClassOpen(false);
    } catch (e: any) {
      showMsg(e.message, 'error');
      throw e;
    }
  };

  // 2. Create Extra Class (Direct Action)
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

      showMsg(`Extra class "${data.classroom.name}" created!`);
      setClassrooms(prev => [data.classroom, ...prev]);
      setCreateExtraOpen(false);
      router.refresh();
    } catch (e: any) {
      showMsg(e.message, 'error');
      throw e;
    }
  };

  // 3. Request Teacher Change (Admin approves)
  const handleRequestTeacherChange = async (formData: FormData) => {
    if (!changeTeacherTarget) return;
    try {
      const res = await fetch('/api/classrooms/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CHANGE_TEACHER',
          classroomId: changeTeacherTarget.id,
          proposedTeacherId: formData.get('proposedTeacherId'),
          reason: formData.get('reason'),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg('Teacher change request submitted for Admin approval.');
      setRequests(prev => [data.request, ...prev]);
      setChangeTeacherOpen(false);
      setChangeTeacherTarget(null);
    } catch (e: any) {
      showMsg(e.message, 'error');
      throw e;
    }
  };

  // 4. Direct Action: Add Co-teacher or Substitute
  const handleAddStaff = async () => {
    if (!staffTarget || !staffTeacherId) return;
    try {
      const res = await fetch(`/api/classrooms/${staffTarget.id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: staffTeacherId,
          role: staffRole,
          endDate: staffRole === 'SUBSTITUTE' && staffEndDate ? staffEndDate : null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg(`${staffRole === 'SUBSTITUTE' ? 'Substitute' : 'Co-teacher'} assigned successfully.`);
      setStaffTeacherId('');
      setStaffEndDate('');
      await refreshClassroom(staffTarget.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Direct Action: Remove Staff
  const handleRemoveStaff = async (staffId: string) => {
    if (!staffTarget) return;
    try {
      const res = await fetch(`/api/classrooms/${staffTarget.id}/staff?staffId=${staffId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg('Staff role removed.');
      await refreshClassroom(staffTarget.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`${department.code} Department Classrooms`}
        description={`Manage departmental curriculum classrooms, assignments, substitutes, and requests for ${department.name}.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReqClassOpen(true)} className="gap-2">
              <Clock className="h-4 w-4" /> Request Official Classroom
            </Button>
            <Button onClick={() => setCreateExtraOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Extra Class
            </Button>
          </div>
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
          { label: 'Department Classrooms', value: stats.total, icon: BookOpen },
          { label: 'Official Classes', value: stats.official, badge: 'Curriculum', badgeVariant: 'default' },
          { label: 'Extra Classes', value: stats.extra, icon: Sparkles, description: 'Remedial & Lab batches' },
          { label: 'Avg Health Score', value: `${stats.avgHealth}%`, icon: GraduationCap, badgeVariant: 'success' },
        ]}
      />

      {/* Main Tabs */}
      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="classes" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Classrooms ({classrooms.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Clock className="h-4 w-4" />
            My Requests ({requests.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Classrooms grouped by Year and Section */}
        <TabsContent value="classes" className="space-y-6">
          {Object.keys(groupedClassrooms).length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No classrooms in department"
              description="No classrooms exist for your department yet. Request an official classroom from Admin or create an extra class."
              action={{
                label: 'Request Official Classroom',
                onClick: () => setReqClassOpen(true),
                icon: Plus,
              }}
            />
          ) : (
            Object.entries(groupedClassrooms).map(([groupTitle, groupClasses]) => (
              <div key={groupTitle} className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <h3 className="font-bold text-base text-foreground tracking-tight">{groupTitle}</h3>
                  <Badge variant="outline" className="text-2xs font-mono">{groupClasses.length} Classes</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupClasses.map(cls => (
                    <Card key={cls.id} className="border border-border/80 shadow-xs hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge variant={cls.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs font-semibold">
                                {cls.type}
                              </Badge>
                              {cls.category && (
                                <Badge variant="outline" className="text-2xs text-primary">
                                  {cls.category}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base font-bold text-foreground">
                              {cls.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {cls.subject?.name} ({cls.subject?.code})
                            </p>
                          </div>
                          {cls.health && (
                            <HealthScoreBadge health={cls.health} size="sm" />
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-0">
                        {/* Teacher & Staff */}
                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Main Teacher:</span>
                            <span className="font-semibold text-foreground">{cls.teacher?.name}</span>
                          </div>
                          {cls.teachers?.length > 0 && (
                            <div className="flex justify-between items-center text-2xs text-muted-foreground pt-1 border-t border-border/40">
                              <span>Staff & Substitutes:</span>
                              <span>{cls.teachers.length} assigned</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-2xs text-muted-foreground">
                            <span>Students Enrolled:</span>
                            <span className="font-semibold text-foreground">{cls.studentCount || cls._count?.enrollments || 0}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-2xs h-8"
                            onClick={() => {
                              setStaffTarget(cls);
                              setStaffDrawerOpen(true);
                              refreshClassroom(cls.id);
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" /> Staff / Sub
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-2xs h-8"
                            onClick={() => {
                              setChangeTeacherTarget(cls);
                              setChangeTeacherOpen(true);
                            }}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Change Teacher
                          </Button>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs h-8 gap-1.5"
                          onClick={() => {
                            setReadDetailClass(cls);
                            setReadDetailOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" /> Read-Only View (Curriculum & Stream)
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Tab 2: HOD Requests */}
        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No requests submitted"
              description="You have not submitted any official classroom or teacher reassignment requests."
            />
          ) : (
            <div className="grid gap-3">
              {requests.map(req => (
                <Card key={req.id} className="border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={req.type === 'CREATE_OFFICIAL' ? 'default' : 'secondary'} className="text-2xs">
                          {req.type === 'CREATE_OFFICIAL' ? 'New Official Classroom' : 'Teacher Reassignment'}
                        </Badge>
                        <Badge
                          variant={req.status === 'PENDING' ? 'warning' : req.status === 'APPROVED' ? 'success' : 'destructive'}
                          className="text-2xs"
                        >
                          {req.status}
                        </Badge>
                        <span className="text-2xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-semibold text-sm">
                        {req.type === 'CREATE_OFFICIAL'
                          ? `Request: ${req.name || 'New Classroom'} (Year ${req.year} Sec ${req.section})`
                          : `Change Teacher for: ${req.classroom?.name}`}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Proposed Teacher: <strong>{req.proposedTeacher?.name}</strong>
                      </p>
                      {req.reason && <p className="text-xs italic text-muted-foreground">Reason: "{req.reason}"</p>}
                      {req.adminComment && (
                        <p className="text-xs text-primary font-medium mt-1">Admin Response: "{req.adminComment}"</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal 1: Request Official Classroom */}
      <FormDialog
        title="Request Official Classroom"
        description="Submit an official classroom creation request to the Administrator approval queue."
        trigger={<span />}
        open={reqClassOpen}
        onOpenChange={setReqClassOpen}
        submitText="Submit Request"
        onSubmit={handleRequestOfficial}
      >
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Subject *</Label>
            <select name="subjectId" required className="flex h-9 w-full rounded-md border text-sm px-3 bg-background">
              <option value="">Select Department Subject</option>
              {deptSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Academic Year *</Label>
              <select name="year" required defaultValue="3" className="flex h-9 w-full rounded-md border text-sm px-3 bg-background">
                {[1, 2, 3, 4].map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Section *</Label>
              <select name="section" required defaultValue="A" className="flex h-9 w-full rounded-md border text-sm px-3 bg-background">
                {['A', 'B', 'C', 'D'].map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Proposed Main Teacher *</Label>
            <select name="proposedTeacherId" required className="flex h-9 w-full rounded-md border text-sm px-3 bg-background">
              <option value="">Select Teacher</option>
              {deptTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.loginId})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>Reason / Note for Admin</Label>
            <Input name="reason" placeholder="e.g. Regular semester curriculum load allocation" />
          </div>
        </div>
      </FormDialog>

      {/* Modal 2: Create Extra Class (Direct Action) */}
      <FormDialog
        title="Create Extra Class"
        description="Directly create an extra class (Remedial, Lab Batch, Revision, Project Group) for your department."
        trigger={<span />}
        open={createExtraOpen}
        onOpenChange={setCreateExtraOpen}
        submitText="Create Class"
        onSubmit={handleCreateExtra}
      >
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Class Name *</Label>
            <Input name="name" placeholder="e.g. CSE-3A Remedial Algorithms" required />
          </div>

          <div className="grid gap-1.5">
            <Label>Subject *</Label>
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
            <input type="checkbox" name="requiresApproval" id="hodReqApproval" className="rounded" />
            <Label htmlFor="hodReqApproval" className="text-xs cursor-pointer">
              Require teacher approval when students join via code
            </Label>
          </div>
        </div>
      </FormDialog>

      {/* Modal 3: Request Teacher Change */}
      <FormDialog
        title="Request Teacher Change"
        description={`Submit a teacher reassignment request for "${changeTeacherTarget?.name}". Admin approves.`}
        trigger={<span />}
        open={changeTeacherOpen}
        onOpenChange={setChangeTeacherOpen}
        submitText="Submit Request"
        onSubmit={handleRequestTeacherChange}
      >
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Proposed Replacement Teacher *</Label>
            <select name="proposedTeacherId" required className="flex h-9 w-full rounded-md border text-sm px-3 bg-background">
              <option value="">Select Teacher</option>
              {deptTeachers.filter(t => t.id !== changeTeacherTarget?.teacherId).map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.loginId})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>Reason for Change *</Label>
            <Input name="reason" placeholder="e.g. On medical leave or timetable redistribution" required />
          </div>
        </div>
      </FormDialog>

      {/* Staff Drawer (Co-Teachers & Substitutes direct action) */}
      <Sheet open={staffDrawerOpen} onOpenChange={setStaffDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6">
          {staffTarget && (
            <div className="space-y-6">
              <SheetHeader className="text-left">
                <SheetTitle className="text-xl font-bold">Manage Staff & Substitutes</SheetTitle>
                <SheetDescription>
                  Directly add co-teachers or substitutes for {staffTarget.name}. No admin approval needed.
                </SheetDescription>
              </SheetHeader>

              {/* Main Teacher */}
              <div className="p-3 rounded-lg bg-muted/40 text-xs">
                <span className="text-muted-foreground block text-2xs uppercase font-semibold">Current Main Teacher</span>
                <span className="font-bold text-sm text-foreground">{staffTarget.teacher?.name}</span>
                <span className="text-muted-foreground block">{staffTarget.teacher?.email}</span>
              </div>

              {/* Existing Staff */}
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Assigned Co-Teachers & Substitutes</Label>
                {staffTarget.teachers?.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No co-teachers or substitutes assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {staffTarget.teachers?.map((st: any) => (
                      <div key={st.id} className="flex items-center justify-between p-2.5 rounded border bg-card text-xs">
                        <div>
                          <p className="font-semibold">{st.teacher?.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-2xs">
                              {st.role === 'CO_TEACHER' ? 'Co-Teacher' : 'Substitute'}
                            </Badge>
                            {st.role === 'SUBSTITUTE' && st.endDate && (
                              <span className="text-2xs text-muted-foreground">
                                Expires: {new Date(st.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive h-7 px-2 text-xs"
                          onClick={() => handleRemoveStaff(st.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Staff */}
              <div className="p-4 border rounded-lg bg-card space-y-3">
                <Label className="font-semibold text-sm">Assign New Staff Member</Label>
                <div className="space-y-2">
                  <select
                    value={staffTeacherId}
                    onChange={e => setStaffTeacherId(e.target.value)}
                    className="w-full h-9 rounded border text-xs px-2 bg-background"
                  >
                    <option value="">Select Department Teacher</option>
                    {deptTeachers.filter(t => t.id !== staffTarget.teacherId).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.loginId})</option>
                    ))}
                  </select>

                  <select
                    value={staffRole}
                    onChange={e => setStaffRole(e.target.value as any)}
                    className="w-full h-9 rounded border text-xs px-2 bg-background"
                  >
                    <option value="CO_TEACHER">Co-Teacher (Can post, grade, take attendance)</option>
                    <option value="SUBSTITUTE">Substitute Teacher (Temporary access with end date)</option>
                  </select>

                  {staffRole === 'SUBSTITUTE' && (
                    <div className="grid gap-1">
                      <Label className="text-2xs text-muted-foreground">Access Expiry End Date</Label>
                      <Input
                        type="date"
                        value={staffEndDate}
                        onChange={e => setStaffEndDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleAddStaff}
                    disabled={!staffTeacherId}
                    className="w-full gap-2 mt-2"
                  >
                    <UserPlus className="h-4 w-4" /> Add to Classroom Staff
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Read-Only Classroom Detail Drawer */}
      <Sheet open={readDetailOpen} onOpenChange={setReadDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          {readDetailClass && (
            <div className="space-y-6">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={readDetailClass.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs">
                    {readDetailClass.type}
                  </Badge>
                  {readDetailClass.health && (
                    <HealthScoreBadge health={readDetailClass.health} size="sm" />
                  )}
                </div>
                <SheetTitle className="text-xl font-bold">{readDetailClass.name}</SheetTitle>
                <SheetDescription>
                  Read-only view for HOD monitoring.
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Card className="p-3 border">
                  <span className="text-muted-foreground block text-2xs uppercase">Main Teacher</span>
                  <span className="font-semibold text-sm">{readDetailClass.teacher?.name}</span>
                </Card>
                <Card className="p-3 border">
                  <span className="text-muted-foreground block text-2xs uppercase">Join Code</span>
                  <span className="font-mono font-bold text-sm text-primary">{readDetailClass.joinCode}</span>
                </Card>
                <Card className="p-3 border">
                  <span className="text-muted-foreground block text-2xs uppercase">Enrolled</span>
                  <span className="font-bold text-sm">{readDetailClass.studentCount || 0} Students</span>
                </Card>
                <Card className="p-3 border">
                  <span className="text-muted-foreground block text-2xs uppercase">Class Rep</span>
                  <span className="font-semibold text-sm">{readDetailClass.classRep?.name || 'None'}</span>
                </Card>
              </div>

              <div className="p-4 border rounded-lg bg-card space-y-3">
                <h4 className="font-semibold text-sm">Classroom Curriculum Links</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Link href={`/teacher/classroom/${readDetailClass.id}`} className="block">
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                      <span>View Stream & Materials</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/hod/marks`} className="block">
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                      <span>Review Finalised Marks</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
