'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  Sparkles,
  FileCheck2,
  Mic,
  Code2,
  CalendarCheck2,
  BookMarked,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Award,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { AiUnavailablePanel } from '@/components/ai/AiUnavailablePanel';
import { AiOutputViewer } from '@/components/ai/AiOutputViewer';

interface StudentStudyClientProps {
  studyDocuments: any[];
  classrooms: any[];
  aiStatus: { isConfigured: boolean; provider: string; reason?: string };
  totalPoints: number;
  dueFlashcardsCount: number;
  upcomingTests: any[];
  upcomingAssignments: any[];
  nextExam: any;
  studentName: string;
}

export function StudentStudyClient({
  studyDocuments: initialDocs,
  classrooms,
  aiStatus,
  totalPoints: initialPoints,
  dueFlashcardsCount,
  upcomingTests,
  upcomingAssignments,
  nextExam,
  studentName,
}: StudentStudyClientProps) {
  const [activeTab, setActiveTab] = useState('study-space');
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolTitle, setCurrentToolTitle] = useState('Study Result');
  const [currentToolType, setCurrentToolType] = useState('STUDY_SPACE');

  // Personal Notes Space state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Answer Checker state
  const [checkerQuestion, setCheckerQuestion] = useState('');
  const [checkerStudentAnswer, setCheckerStudentAnswer] = useState('');

  // Viva Practice state
  const [vivaTopic, setVivaTopic] = useState('');
  const [vivaAnswer, setVivaAnswer] = useState('');

  // Code Helper state
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('Python / C++');
  const [codeAction, setCodeAction] = useState('EXPLAIN');
  const [hintLevel, setHintLevel] = useState(1);
  const [showFullSolution, setShowFullSolution] = useState(false);

  // Glossary Builder state
  const [glossarySubject, setGlossarySubject] = useState('');

  // Pomodoro Focus Timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(initialPoints);
  const [completedSessions, setCompletedSessions] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      setCompletedSessions((prev) => prev + 1);
      setTimerSeconds(25 * 60);
      // Award Pomodoro XP Points
      fetch('/api/student/pomodoro', { method: 'POST' })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setEarnedPoints((prev) => prev + 15);
            alert('🎉 Pomodoro Session Completed! 15 XP points awarded to your rank ledger.');
          }
        })
        .catch(() => {});
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const runStream = async (toolType: string, toolTitle: string, prompt: string, systemPrompt?: string) => {
    setOutput('');
    setCurrentToolTitle(toolTitle);
    setCurrentToolType(toolType);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          tool: toolType,
          prompt,
          systemPrompt,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start AI generation');
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xs font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/40 px-2 py-0.5 rounded-full">
              Personal Study Hub
            </span>
            <Badge variant="outline" className="text-2xs font-mono">
              Points: {earnedPoints} XP
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Study Space & AI Practice Lab
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your personal private space to summarize notes, practice viva, check answers, get code hints, and focus.
          </p>
        </div>
      </div>

      {!aiStatus.isConfigured && (
        <AiUnavailablePanel status="not_configured" userRole="STUDENT" reason={aiStatus.reason} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 rounded-lg">
          <TabsTrigger value="study-space" className="text-xs gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Notes & Flashcards
          </TabsTrigger>
          <TabsTrigger value="answer-checker" className="text-xs gap-1.5">
            <FileCheck2 className="h-3.5 w-3.5" /> Answer Checker
          </TabsTrigger>
          <TabsTrigger value="viva" className="text-xs gap-1.5">
            <Mic className="h-3.5 w-3.5" /> Viva Voce Practice
          </TabsTrigger>
          <TabsTrigger value="code-helper" className="text-xs gap-1.5">
            <Code2 className="h-3.5 w-3.5" /> Code & Hint Ladder
          </TabsTrigger>
          <TabsTrigger value="today-plan" className="text-xs gap-1.5">
            <CalendarCheck2 className="h-3.5 w-3.5" /> Today&apos;s Plan & Pomodoro
          </TabsTrigger>
          <TabsTrigger value="glossary" className="text-xs gap-1.5">
            <BookMarked className="h-3.5 w-3.5" /> Glossary Builder
          </TabsTrigger>
        </TabsList>

        {/* 1. Notes & Flashcards */}
        <TabsContent value="study-space" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Personal Study Space (Private Notes)</CardTitle>
              <CardDescription className="text-xs">
                Paste your lecture notes or textbook extracts. Notes stay 100% private to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Note Title / Topic</label>
                <Input
                  placeholder="e.g. Operating Systems: Deadlock Detection & Recovery"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Notes Content (Paste or write here)</label>
                <Textarea
                  placeholder="Paste lecture notes, book excerpts, or formulas here..."
                  value={noteContent}
                  onChange={(e: any) => setNoteContent(e.target.value)}
                  rows={6}
                  className="text-xs font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() =>
                    runStream(
                      'SUMMARY',
                      `Summary: ${noteTitle || 'Personal Notes'}`,
                      `Summarize these notes clearly into key concepts, main theorems, and practical significance:\n\n${noteContent}`
                    )
                  }
                  disabled={isStreaming || !noteContent.trim() || !aiStatus.isConfigured}
                  className="text-xs gap-1 bg-primary text-primary-foreground"
                >
                  <Sparkles className="h-3 w-3" /> Summarise Notes
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    runStream(
                      'FLASHCARDS',
                      `Flashcards: ${noteTitle || 'Personal Notes'}`,
                      `Generate 5 high-yield revision flashcards (Front/Back) based on these notes using SM-2 spaced repetition principles:\n\n${noteContent}`
                    )
                  }
                  disabled={isStreaming || !noteContent.trim() || !aiStatus.isConfigured}
                  className="text-xs gap-1"
                >
                  <Layers className="h-3 w-3" /> Make Flashcards
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    runStream(
                      'QUIZ',
                      `Practice Quiz: ${noteTitle || 'Personal Notes'}`,
                      `Create a 5-question self-assessment practice quiz with detailed explanations from these notes:\n\n${noteContent}`
                    )
                  }
                  disabled={isStreaming || !noteContent.trim() || !aiStatus.isConfigured}
                  className="text-xs gap-1"
                >
                  <HelpCircle className="h-3 w-3" /> Practice Quiz
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    runStream(
                      'MIND_MAP',
                      `Mind Map Outline: ${noteTitle || 'Personal Notes'}`,
                      `Construct a hierarchical markdown Mind-Map outline mapping core topics to sub-branches from these notes:\n\n${noteContent}`
                    )
                  }
                  disabled={isStreaming || !noteContent.trim() || !aiStatus.isConfigured}
                  className="text-xs gap-1"
                >
                  <Lightbulb className="h-3 w-3" /> Mind-Map Outline
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    runStream(
                      'FORMULA_SHEET',
                      `Formula & Terms Sheet: ${noteTitle || 'Personal Notes'}`,
                      `Extract a cheat-sheet table of all key definitions, mathematical equations, and formulas from these notes:\n\n${noteContent}`
                    )
                  }
                  disabled={isStreaming || !noteContent.trim() || !aiStatus.isConfigured}
                  className="text-xs gap-1"
                >
                  <FileText className="h-3 w-3" /> Key Terms & Formula Sheet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Answer Checker */}
        <TabsContent value="answer-checker" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Practice Answer Checker</CardTitle>
                <Badge variant="outline" className="text-2xs text-amber-700 bg-amber-50">
                  Practice only · Never counted as marks
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Write your draft answer to an exam question to get diagnostic feedback: what is correct, what is missing, and how to improve.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Exam Question</label>
                <Input
                  placeholder="e.g. Explain the difference between Process and Thread with diagrams/examples."
                  value={checkerQuestion}
                  onChange={(e) => setCheckerQuestion(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Your Draft Answer</label>
                <Textarea
                  placeholder="Type your explanation as you would in the university examination..."
                  value={checkerStudentAnswer}
                  onChange={(e: any) => setCheckerStudentAnswer(e.target.value)}
                  rows={5}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() =>
                  runStream(
                    'ANSWER_CHECKER',
                    `Answer Review: ${checkerQuestion.slice(0, 40)}...`,
                    `Evaluate this student draft answer for an engineering exam:\nQuestion: ${checkerQuestion}\nStudent's Answer: ${checkerStudentAnswer}\nOutput:\n1. What is Right (Commendations)\n2. What is Missing (Crucial points needed for full marks)\n3. Suggested Improved Answer (Model response with standard university terminology)`
                  )
                }
                disabled={isStreaming || !checkerQuestion.trim() || !checkerStudentAnswer.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Check My Answer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Viva Voce Practice */}
        <TabsContent value="viva" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Interactive Viva Voce Practice</CardTitle>
              <CardDescription className="text-xs">
                Simulates real oral viva exams with immediate constructive feedback and diagnostic weak-area mapping.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Viva Topic</label>
                <Input
                  placeholder="e.g. Computer Networks: Sliding Window Protocols & Flow Control"
                  value={vivaTopic}
                  onChange={(e) => setVivaTopic(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Your Spoken / Typed Response (Optional)</label>
                <Textarea
                  placeholder="If answering an ongoing question, type your response here..."
                  value={vivaAnswer}
                  onChange={(e: any) => setVivaAnswer(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    runStream(
                      'VIVA_PRACTICE',
                      `Viva Simulation: ${vivaTopic}`,
                      `Act as a strict but encouraging university viva voce examiner for "${vivaTopic}".\nStudent Answer (if provided): "${vivaAnswer}".\nProvide:\n1. Critique of the student's answer (clarity, technical accuracy).\n2. Follow-up viva question testing deeper intuition.\n3. Summary of concepts to revise.`
                    )
                  }
                  disabled={isStreaming || !vivaTopic.trim() || !aiStatus.isConfigured}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
                >
                  {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                  Ask Viva Question / Evaluate
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Code Helper with Hint Ladder */}
        <TabsContent value="code-helper" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Code Helper & Hint Ladder (CSE / IT / AIDS / AIML)</CardTitle>
              <CardDescription className="text-xs">
                Examine programming algorithms with step-by-step hand tracing or incremental hints. No code is executed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Language</label>
                  <Input
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Action Mode</label>
                  <Select value={codeAction} onValueChange={(val: any) => setCodeAction(val || 'EXPLAIN')}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPLAIN" className="text-xs">Line-by-line Explanation</SelectItem>
                      <SelectItem value="HAND_TRACE" className="text-xs">Hand-trace Execution Table</SelectItem>
                      <SelectItem value="HINT_LADDER" className="text-xs">Hint Ladder (Guided Thinking)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Paste Code or Algorithm</label>
                <Textarea
                  placeholder="Paste your source code or buggy function here..."
                  value={codeSnippet}
                  onChange={(e: any) => setCodeSnippet(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>

              {codeAction === 'HINT_LADDER' ? (
                <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                  <p className="text-xs font-semibold text-foreground">Incremental Hint Ladder:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setHintLevel(1);
                        runStream('CODE_HINT', 'Hint 1: Conceptual Direction', `Look at this code:\n${codeSnippet}\nGive HINT 1 ONLY (subtle clue on algorithm approach, no code solution).`);
                      }}
                      className="text-xs"
                    >
                      Hint 1: Concept Clue
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setHintLevel(2);
                        runStream('CODE_HINT', 'Hint 2: Edge Cases & Logic', `Look at this code:\n${codeSnippet}\nGive HINT 2 (point out specific line or logic where boundary cases fail).`);
                      }}
                      className="text-xs"
                    >
                      Hint 2: Edge Cases
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setHintLevel(3);
                        runStream('CODE_HINT', 'Hint 3: Pseudocode Outline', `Look at this code:\n${codeSnippet}\nGive HINT 3 (high-level pseudocode structure, without full code).`);
                      }}
                      className="text-xs"
                    >
                      Hint 3: Pseudocode
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to reveal the full solution? Try solving with hints first!')) {
                          runStream('CODE_SOLUTION', 'Full Solution & Explanation', `Provide corrected, optimized solution with complete explanation for:\n${codeSnippet}`);
                        }
                      }}
                      className="text-xs"
                    >
                      Reveal Full Solution
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() =>
                    runStream(
                      'CODE_ANALYSIS',
                      codeAction === 'HAND_TRACE' ? 'Hand-Trace Execution' : 'Code Explanation',
                      codeAction === 'HAND_TRACE'
                        ? `Hand-trace the execution of this code on sample input:\n${codeSnippet}\nProvide variable state table across loop iterations and explain time/space complexity.`
                        : `Explain this ${codeLanguage} code step-by-step for a computer science student:\n${codeSnippet}\nHighlight core logic, memory implications, and asymptotic complexity.`
                    )
                  }
                  disabled={isStreaming || !codeSnippet.trim() || !aiStatus.isConfigured}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
                >
                  {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}
                  {codeAction === 'HAND_TRACE' ? 'Generate Hand-Trace Table' : 'Explain Code Logic'}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Today's Plan & Pomodoro */}
        <TabsContent value="today-plan" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pomodoro Focus Timer */}
            <Card className="md:col-span-1 border-primary/30">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-base text-primary">Pomodoro Focus Timer</CardTitle>
                <CardDescription className="text-2xs">
                  25 min focus interval = +15 XP leaderboard points
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="text-4xl font-mono font-bold text-foreground py-2 tracking-widest bg-muted/30 rounded-lg border">
                  {formatTimer(timerSeconds)}
                </div>

                <div className="flex justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1 text-xs"
                  >
                    {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {timerRunning ? 'Pause' : 'Start Focus'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimerSeconds(25 * 60);
                    }}
                    className="text-xs gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                </div>

                <div className="text-3xs text-muted-foreground border-t pt-2 space-y-0.5">
                  <p>Completed today: <strong>{completedSessions} sessions</strong></p>
                  <p>Total Study XP: <strong>{earnedPoints} points</strong></p>
                </div>
              </CardContent>
            </Card>

            {/* Today's Real Schedule & Deadlines */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Today&apos;s Milestones & Deadlines</CardTitle>
                <CardDescription className="text-xs">
                  Real items synced directly from your classroom database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {upcomingAssignments.length > 0 ? (
                    upcomingAssignments.map((a) => (
                      <div key={a.id} className="p-2.5 rounded-lg border flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold">{a.title}</p>
                          <span className="text-3xs text-muted-foreground">Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                        </div>
                        <Badge variant="outline" className="text-2xs text-amber-800">Assignment</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 border border-dashed rounded-lg text-xs text-muted-foreground text-center">
                      No assignments due today.
                    </div>
                  )}

                  {upcomingTests.length > 0 && (
                    upcomingTests.map((t) => (
                      <div key={t.id} className="p-2.5 rounded-lg border bg-amber-50/50 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-amber-900">{t.title}</p>
                          <span className="text-3xs text-amber-700">Starts: {new Date(t.startTime).toLocaleTimeString()}</span>
                        </div>
                        <Badge variant="destructive" className="text-2xs">Test Today</Badge>
                      </div>
                    ))
                  )}

                  {dueFlashcardsCount > 0 && (
                    <div className="p-2.5 rounded-lg border bg-secondary/15 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{dueFlashcardsCount} Flashcards Due for Review</p>
                        <span className="text-3xs text-muted-foreground">Spaced repetition interval ready</span>
                      </div>
                      <Badge variant="secondary" className="text-2xs bg-secondary text-primary font-bold">Review</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 6. Glossary Builder */}
        <TabsContent value="glossary" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Subject Glossary Builder</CardTitle>
              <CardDescription className="text-xs">
                Creates an index of technical terminology, acronyms, and formulas for any course.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Subject / Unit</label>
                <Input
                  placeholder="e.g. Distributed Systems & Cloud Computing"
                  value={glossarySubject}
                  onChange={(e) => setGlossarySubject(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() =>
                  runStream(
                    'GLOSSARY',
                    `Glossary: ${glossarySubject}`,
                    `Compile an alphabetical glossary of the 15 most important technical terms and concepts for "${glossarySubject}".\nInclude:\n- Formal definition\n- Concise layman explanation\n- Standard formula or diagram reference if applicable.`
                  )
                }
                disabled={isStreaming || !glossarySubject.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Build Subject Glossary
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Output Viewer Section */}
      {(output || isStreaming) && (
        <AiOutputViewer
          toolTitle={currentToolTitle}
          toolType={currentToolType}
          output={output}
          isStreaming={isStreaming}
          onStop={handleStop}
        />
      )}
    </div>
  );
}
