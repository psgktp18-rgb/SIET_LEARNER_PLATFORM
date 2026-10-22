'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
  BookOpen,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

interface StudentClassroomsClientProps {
  userId: string;
  enrolledClasses: any[];
  pendingRequests: any[];
}

export function StudentClassroomsClient({
  userId,
  enrolledClasses: initialEnrolled,
  pendingRequests: initialPending,
}: StudentClassroomsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [enrolled, setEnrolled] = useState<any[]>(initialEnrolled);
  const [pending, setPending] = useState<any[]>(initialPending);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Check URL query parameter `code`
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setJoinCodeInput(code.toUpperCase());
      setJoinOpen(true);
    }
  }, [searchParams]);

  const showMsg = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const handleJoinClass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/student/join-classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCodeInput.trim().toUpperCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.pendingApproval) {
        showMsg(data.message || 'Request pending teacher approval.', 'warning');
        if (data.request) {
          setPending(prev => [data.request, ...prev]);
        }
      } else {
        showMsg(data.message || 'Joined classroom successfully!', 'success');
        if (data.classroom) {
          setEnrolled(prev => [data.classroom, ...prev]);
        }
      }
      setJoinCodeInput('');
      setJoinOpen(false);
      router.refresh();
    } catch (err: any) {
      showMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const officialClasses = enrolled.filter(c => c.type === 'OFFICIAL');
  const extraClasses = enrolled.filter(c => c.type === 'EXTRA');

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="My Classrooms"
        description="Access institutional course curriculum, study materials, notes, assignments, and extra classes."
        actions={
          <Button onClick={() => setJoinOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Join Class with Code
          </Button>
        }
      />

      {msg && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium border ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : msg.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Stat Cards */}
      <StatCards
        stats={[
          { label: 'Enrolled Classes', value: enrolled.length, icon: BookOpen },
          { label: 'Official Curriculum', value: officialClasses.length, badge: 'Official', badgeVariant: 'default' },
          { label: 'Extra Classes', value: extraClasses.length, icon: Sparkles, description: 'Remedial & Lab batches' },
          { label: 'Pending Join Requests', value: pending.length, icon: Clock, badgeVariant: 'warning' },
        ]}
      />

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="gap-2">
            <BookOpen className="h-4 w-4" />
            All Classes ({enrolled.length})
          </TabsTrigger>
          <TabsTrigger value="official" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Official ({officialClasses.length})
          </TabsTrigger>
          <TabsTrigger value="extra" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Extra Classes ({extraClasses.length})
          </TabsTrigger>
          {pending.length > 0 && (
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending Requests ({pending.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: All Classes */}
        <TabsContent value="all" className="space-y-4">
          {enrolled.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No classrooms joined yet"
              description="You have not joined any classrooms yet. Use a join code provided by your teacher to enroll in extra classes."
              action={{
                label: 'Join with Code',
                onClick: () => setJoinOpen(true),
                icon: Plus,
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolled.map(cls => (
                <ClassCard key={cls.id} cls={cls} userId={userId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Official Classes */}
        <TabsContent value="official" className="space-y-4">
          {officialClasses.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No official classes enrolled"
              description="Official curriculum classrooms are enrolled by Administrators based on your department, year, and section."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {officialClasses.map(cls => (
                <ClassCard key={cls.id} cls={cls} userId={userId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Extra Classes */}
        <TabsContent value="extra" className="space-y-4">
          {extraClasses.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No extra classes joined"
              description="Join remedial sessions, revision batches, or project groups using your teacher's join code."
              action={{
                label: 'Join Extra Class',
                onClick: () => setJoinOpen(true),
                icon: Plus,
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {extraClasses.map(cls => (
                <ClassCard key={cls.id} cls={cls} userId={userId} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Pending Requests */}
        {pending.length > 0 && (
          <TabsContent value="pending" className="space-y-4">
            <div className="grid gap-3">
              {pending.map(p => (
                <Card key={p.id} className="border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="warning" className="text-2xs">Pending Teacher Approval</Badge>
                        <span className="text-2xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-semibold text-sm">{p.classroom?.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {p.classroom?.subject?.name} · Taught by {p.classroom?.teacher?.name}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Join Class Dialog */}
      <FormDialog
        title="Join a Classroom"
        description="Enter the 6-character classroom code provided by your teacher."
        trigger={<span />}
        open={joinOpen}
        onOpenChange={setJoinOpen}
        submitText="Join Class"
        onSubmit={async () => handleJoinClass()}
      >
        <div className="space-y-3">
          <Label>Classroom Join Code *</Label>
          <Input
            value={joinCodeInput}
            onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g. AB4X9Z"
            maxLength={10}
            className="font-mono text-center tracking-widest text-lg font-bold uppercase"
            required
            autoFocus
          />
          <p className="text-2xs text-muted-foreground text-center">
            If the class requires approval, your request will be queued for the teacher to accept.
          </p>
        </div>
      </FormDialog>
    </div>
  );
}

function ClassCard({ cls, userId }: { cls: any; userId: string }) {
  const isClassRep = cls.classRepId === userId;

  return (
    <Card className="border border-border/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Badge variant={cls.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs font-semibold">
                {cls.type === 'OFFICIAL' ? 'Official' : 'Extra Class'}
              </Badge>
              {cls.category && (
                <Badge variant="outline" className="text-2xs text-primary">
                  {cls.category}
                </Badge>
              )}
              {isClassRep && (
                <Badge variant="secondary" className="text-2xs gap-1 bg-amber-100 text-amber-800 border-amber-300">
                  <UserCheck className="h-3 w-3" /> Class Representative
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
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Teacher:</span>
            <span className="font-semibold text-foreground">{cls.teacher?.name}</span>
          </div>
          <div className="flex justify-between items-center text-2xs text-muted-foreground">
            <span>Class:</span>
            <span>Year {cls.year} · Section {cls.section}</span>
          </div>
          <div className="flex justify-between items-center text-2xs text-muted-foreground">
            <span>Notes Available:</span>
            <span>{cls._count?.notes || 0}</span>
          </div>
          <div className="flex justify-between items-center text-2xs text-muted-foreground">
            <span>Assignments:</span>
            <span>{cls._count?.assignments || 0}</span>
          </div>
        </div>

        <Link href={`/student/classroom/${cls.id}`} className="block">
          <Button size="sm" className="w-full text-xs h-8 gap-1.5 shadow-xs">
            <span>Enter Classroom</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
