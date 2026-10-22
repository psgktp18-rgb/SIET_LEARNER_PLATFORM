'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Printer,
  FileText,
  Calendar,
  Layers,
  Loader2,
} from 'lucide-react';
import { AiUnavailablePanel } from '@/components/ai/AiUnavailablePanel';
import { AiOutputViewer } from '@/components/ai/AiOutputViewer';

interface HodAiInsightsClientProps {
  department: any;
  classrooms: any[];
  teachers: any[];
  finalisedMarks: any[];
  aiStatus: { isConfigured: boolean; provider: string; reason?: string };
}

export function HodAiInsightsClient({
  department,
  classrooms,
  teachers,
  finalisedMarks,
  aiStatus,
}: HodAiInsightsClientProps) {
  const [activeTab, setActiveTab] = useState('digest');
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolTitle, setCurrentToolTitle] = useState('Department Digest');
  const abortControllerRef = useRef<AbortController | null>(null);

  const finalisedClassroomIds = new Set(finalisedMarks.map((f) => f.classroomId));

  const totalClassrooms = classrooms.length;
  const finalisedCount = finalisedMarks.length;
  const pendingCount = totalClassrooms - finalisedCount;
  const totalNotes = classrooms.reduce((acc, c) => acc + c._count.notes, 0);
  const totalAssignments = classrooms.reduce((acc, c) => acc + c._count.assignments, 0);

  const generateDigestPrompt = () => {
    return `Generate a department executive weekly briefing for the ${department.name} department at SIET.\nAggregated Metrics:\n- Total Classrooms: ${totalClassrooms}\n- Total Uploaded Learning Materials: ${totalNotes}\n- Total Assignments Released: ${totalAssignments}\n- Internal Marks Finalised: ${finalisedCount} of ${totalClassrooms} (${Math.round((finalisedCount / (totalClassrooms || 1)) * 100)}%)\n- Pending Marks: ${pendingCount}\nProvide:\n1. Department Executive Summary\n2. Academic Progression & Syllabus Pace Analysis\n3. Actionable Recommendations for Faculty Meeting.`;
  };

  const generateSyllabusPrompt = () => {
    const classData = classrooms.map((c) => ({
      subject: c.subject.name,
      teacher: c.teacher.name,
      notesUploaded: c._count.notes,
      assignments: c._count.assignments,
    }));
    return `Analyze syllabus coverage across course handling faculty for ${department.name}:\nData: ${JSON.stringify(classData)}\nProvide:\n1. Comparative course material coverage across year groups.\n2. Faculty teaching pace breakdown.\n3. Courses requiring material updates or curriculum review.`;
  };

  const generateAtRiskPrompt = () => {
    return `Generate an aggregated departmental Early Warning & Academic Risk Assessment for ${department.name}.\nContext: Based on internal attendance threshold (75%) and assignment completion rates across ${totalClassrooms} classrooms.\nProvide:\n1. Common root causes of academic lag (attendance dips vs assignment delays).\n2. Targeted remedial recommendations by year group.\n3. Intervention timetable for slow learners.`;
  };

  const runStream = async (toolTitle: string, prompt: string) => {
    setOutput('');
    setCurrentToolTitle(toolTitle);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          tool: 'HOD_INSIGHTS',
          prompt,
          systemPrompt: `You are an academic management advisor for the Head of Department at Sri Shakthi Institute of Engineering and Technology (SIET). Analyze ONLY aggregated, anonymous statistics. Never fabricate names or marks. Provide executive-ready, professional reports.`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate insights');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') {
                isDone = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  setOutput((prev) => prev + parsed.text);
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setOutput((prev) => prev + `\n\n[Error: ${err.message || 'AI request interrupted'}]`);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xs font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/40 px-2 py-0.5 rounded-full">
              HOD Leadership Hub
            </span>
            <Badge variant="outline" className="text-2xs font-mono">
              Engine: {aiStatus.provider}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {department.name} · AI Department Insights
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated academic digest, syllabus pace auditing, and early risk intervention synthesis.
          </p>
        </div>
      </div>

      {!aiStatus.isConfigured && (
        <AiUnavailablePanel status="not_configured" userRole="HOD" reason={aiStatus.reason} />
      )}

      {/* Aggregate Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-primary">
          <p className="text-3xs uppercase font-semibold text-muted-foreground">Classrooms</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalClassrooms}</p>
          <span className="text-3xs text-muted-foreground">Across all year groups</span>
        </Card>
        <Card className="p-3 border-l-4 border-l-blue-500">
          <p className="text-3xs uppercase font-semibold text-muted-foreground">Course Materials</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalNotes}</p>
          <span className="text-3xs text-muted-foreground">Uploaded notes & decks</span>
        </Card>
        <Card className="p-3 border-l-4 border-l-green-600">
          <p className="text-3xs uppercase font-semibold text-muted-foreground">Marks Finalised</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{finalisedCount} / {totalClassrooms}</p>
          <span className="text-3xs text-muted-foreground">{pendingCount} pending finalisation</span>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500">
          <p className="text-3xs uppercase font-semibold text-muted-foreground">Assignments</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalAssignments}</p>
          <span className="text-3xs text-muted-foreground">Active coursework sets</span>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 rounded-lg">
          <TabsTrigger value="digest" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-secondary" /> Weekly AI Digest
          </TabsTrigger>
          <TabsTrigger value="syllabus" className="text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Syllabus Coverage Pace
          </TabsTrigger>
          <TabsTrigger value="at-risk" className="text-xs gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> At-Risk Diagnostic
          </TabsTrigger>
          <TabsTrigger value="faculty-marks" className="text-xs gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Marks Finalisation Matrix
          </TabsTrigger>
        </TabsList>

        {/* 1. Weekly Digest */}
        <TabsContent value="digest" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Department Weekly Executive Briefing</CardTitle>
              <CardDescription className="text-xs">
                Synthesizes whole-department engagement, attendance pace, and marks progress into an executive brief.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Built strictly from aggregated metrics across {totalClassrooms} classrooms and {teachers.length} faculty members.
              </p>
              <Button
                onClick={() => runStream('Weekly Executive Department Briefing', generateDigestPrompt())}
                disabled={isStreaming || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Department Digest
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Syllabus Coverage */}
        <TabsContent value="syllabus" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Syllabus Coverage Pace Analysis</CardTitle>
              <CardDescription className="text-xs">
                Evaluates lecture notes uploading velocity against curriculum schedules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => runStream('Syllabus Coverage & Pace Audit', generateSyllabusPrompt())}
                disabled={isStreaming || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Syllabus Pace Audit
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. At Risk Summary */}
        <TabsContent value="at-risk" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aggregated At-Risk Student Diagnostic</CardTitle>
              <CardDescription className="text-xs">
                Synthesizes attendance dips and incomplete submissions to recommend department remedial interventions. No private mentor notes are ever exposed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => runStream('Department Academic Risk & Remedial Action Plan', generateAtRiskPrompt())}
                disabled={isStreaming || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Risk Diagnostic
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Marks Finalisation Status Table */}
        <TabsContent value="faculty-marks" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Teacher-wise Marks Finalisation Status</CardTitle>
              <CardDescription className="text-xs">
                Real-time tracking of internal marks submission across all departmental classrooms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classrooms.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No classrooms active in this department.
                </div>
              ) : (
                <div className="divide-y border rounded-lg text-xs">
                  {classrooms.map((c) => {
                    const isFinalised = finalisedClassroomIds.has(c.id);
                    return (
                      <div key={c.id} className="p-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">
                            {c.subject.name} ({c.subject.code})
                          </p>
                          <span className="text-muted-foreground text-2xs">
                            Year {c.year} · Sec {c.section} · Taught by {c.teacher.name}
                          </span>
                        </div>
                        <div>
                          {isFinalised ? (
                            <Badge variant="outline" className="text-2xs text-green-700 bg-green-50 border-green-300 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Finalised & Locked
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-2xs bg-amber-100 text-amber-800 border-amber-300">
                              Pending Finalisation
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Output Viewer Section */}
      {(output || isStreaming) && (
        <AiOutputViewer
          toolTitle={currentToolTitle}
          toolType="HOD_INSIGHTS"
          output={output}
          isStreaming={isStreaming}
          onStop={() => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            setIsStreaming(false);
          }}
        />
      )}
    </div>
  );
}
