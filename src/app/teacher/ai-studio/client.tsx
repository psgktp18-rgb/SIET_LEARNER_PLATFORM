'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles,
  BookOpen,
  FileQuestion,
  GraduationCap,
  ListChecks,
  FlaskConical,
  Presentation,
  CheckCircle,
  FileText,
  Search,
  Users,
  Video,
  Bookmark,
  Send,
  Loader2,
  Trash2,
} from 'lucide-react';
import { AiUnavailablePanel } from '@/components/ai/AiUnavailablePanel';
import { AiOutputViewer } from '@/components/ai/AiOutputViewer';

interface ClassroomItem {
  id: string;
  name: string;
  subject: { name: string; code: string };
  year: number;
  section: string;
}

interface NoteItem {
  id: string;
  title: string;
  unit?: string | null;
  classroomId: string;
}

interface SavedGeneration {
  id: string;
  tool: string;
  title: string;
  content: string;
  createdAt: any;
}

interface TeacherAiStudioClientProps {
  userRole: string;
  classrooms: ClassroomItem[];
  notes: NoteItem[];
  aiStatus: { isConfigured: boolean; provider: string; reason?: string };
  savedLibrary: SavedGeneration[];
}

export function TeacherAiStudioClient({
  userRole,
  classrooms,
  notes,
  aiStatus,
  savedLibrary: initialLibrary,
}: TeacherAiStudioClientProps) {
  const [activeTab, setActiveTab] = useState('lesson-plan');
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolTitle, setCurrentToolTitle] = useState('Generated Result');
  const [currentToolType, setCurrentToolType] = useState('LESSON_PLAN');
  const [library, setLibrary] = useState<SavedGeneration[]>(initialLibrary);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form states for different tools
  const [lessonTopic, setLessonTopic] = useState('');
  const [lessonDuration, setLessonDuration] = useState('50 mins');
  const [lessonLevel, setLessonLevel] = useState('Undergraduate 3rd Year');
  const [lessonOutcomes, setLessonOutcomes] = useState('');

  const [qpSubject, setQpSubject] = useState('');
  const [qpUnits, setQpUnits] = useState('Units 1, 2, and 3');
  const [qpPattern, setQpPattern] = useState('Part A (5x2=10), Part B (2x13=26), Part C (1x14=14)');
  const [qpDifficulty, setQpDifficulty] = useState('Balanced (30% Easy, 50% Medium, 20% Hard)');

  const [quizTopic, setQuizTopic] = useState('');
  const [quizCount, setQuizCount] = useState('5');
  const [quizTypes, setQuizTypes] = useState('MCQ, Fill in blank, and Short Answer');

  const [rubricTopic, setRubricTopic] = useState('');
  const [rubricMaxMarks, setRubricMaxMarks] = useState('20');

  const [labTopic, setLabTopic] = useState('');
  const [workedExampleTopic, setWorkedExampleTopic] = useState('');
  const [feedbackStudentAnswer, setFeedbackStudentAnswer] = useState('');
  const [feedbackRubric, setFeedbackRubric] = useState('');

  const [notesQuery, setNotesQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(classrooms[0]?.id || '');
  const [recapWeek, setRecapWeek] = useState('Week 4');
  const [meetTranscript, setMeetTranscript] = useState('');

  const runStreamGeneration = async (
    toolType: string,
    toolTitle: string,
    prompt: string,
    systemPrompt?: string
  ) => {
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
          classroomId: selectedClassId || undefined,
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

  const deleteLibraryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/library?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLibrary((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xs font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/40 px-2 py-0.5 rounded-full">
              Teaching Copilot
            </span>
            <Badge variant="outline" className="text-2xs font-mono">
              Engine: {aiStatus.provider}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Teacher AI Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prepare curriculum-aligned lesson plans, question papers, rubrics, and quizzes. Works independently of any classroom.
          </p>
        </div>
      </div>

      {!aiStatus.isConfigured && (
        <AiUnavailablePanel status="not_configured" userRole={userRole} reason={aiStatus.reason} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 rounded-lg">
          <TabsTrigger value="lesson-plan" className="text-xs gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Lesson Plan
          </TabsTrigger>
          <TabsTrigger value="question-paper" className="text-xs gap-1.5">
            <FileQuestion className="h-3.5 w-3.5" /> Question Paper
          </TabsTrigger>
          <TabsTrigger value="quiz" className="text-xs gap-1.5">
            <ListChecks className="h-3.5 w-3.5" /> Quizzes
          </TabsTrigger>
          <TabsTrigger value="rubric" className="text-xs gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Rubrics & Ideas
          </TabsTrigger>
          <TabsTrigger value="lab-viva" className="text-xs gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" /> Lab & Viva
          </TabsTrigger>
          <TabsTrigger value="slides" className="text-xs gap-1.5">
            <Presentation className="h-3.5 w-3.5" /> Examples & Slides
          </TabsTrigger>
          <TabsTrigger value="feedback" className="text-xs gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> Feedback & Grading
          </TabsTrigger>
          <TabsTrigger value="ask-notes" className="text-xs gap-1.5">
            <Search className="h-3.5 w-3.5" /> Ask My Notes
          </TabsTrigger>
          <TabsTrigger value="class-insight" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" /> Insights & Recap
          </TabsTrigger>
          <TabsTrigger value="meet-summary" className="text-xs gap-1.5">
            <Video className="h-3.5 w-3.5" /> Meet Summary
          </TabsTrigger>
          <TabsTrigger value="library" className="text-xs gap-1.5 text-primary font-bold">
            <Bookmark className="h-3.5 w-3.5" /> Saved Library ({library.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Lesson Plan Generator */}
        <TabsContent value="lesson-plan" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lesson Plan Generator</CardTitle>
              <CardDescription className="text-xs">
                Generates a timed outline, pedagogical activities, discussion prompts, and quick formative assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Topic / Concept</label>
                  <Input
                    placeholder="e.g. Dynamic Programming: 0/1 Knapsack"
                    value={lessonTopic}
                    onChange={(e) => setLessonTopic(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Lecture Duration</label>
                  <Input
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Class Level</label>
                  <Input
                    value={lessonLevel}
                    onChange={(e) => setLessonLevel(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Target Learning Outcomes (Optional)</label>
                <Input
                  placeholder="e.g. Students should be able to formulate recursive relation and build the 2D memoization table"
                  value={lessonOutcomes}
                  onChange={(e) => setLessonOutcomes(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'LESSON_PLAN',
                    `Lesson Plan: ${lessonTopic || 'Engineering Concept'}`,
                    `Create an interactive, structured lesson plan for college engineering students.\nTopic: ${lessonTopic}\nDuration: ${lessonDuration}\nLevel: ${lessonLevel}\nDesired Outcomes: ${lessonOutcomes}\nFormat the output with:\n1. Learning Objectives (Bloom's Taxonomy)\n2. Timed Breakdown (Introduction, Core Theory, Worked Demonstration, Active Group Discussion, Q&A)\n3. 3 Key Discussion Questions\n4. 3-Minute Exit Ticket Formative Assessment.`
                  )
                }
                disabled={isStreaming || !lessonTopic.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Lesson Plan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Question Paper Builder */}
        <TabsContent value="question-paper" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Question Paper Builder</CardTitle>
              <CardDescription className="text-xs">
                Constructs Anna University / SIET format exam papers with answer keys and evaluation criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Subject / Course</label>
                  <Input
                    placeholder="e.g. CS3491 Artificial Intelligence and Machine Learning"
                    value={qpSubject}
                    onChange={(e) => setQpSubject(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Syllabus Units Covered</label>
                  <Input
                    value={qpUnits}
                    onChange={(e) => setQpUnits(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Question Paper Pattern & Mark Breakdown</label>
                  <Input
                    value={qpPattern}
                    onChange={(e) => setQpPattern(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Difficulty Mix</label>
                  <Input
                    value={qpDifficulty}
                    onChange={(e) => setQpDifficulty(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'QUESTION_PAPER',
                    `Question Paper: ${qpSubject || 'Course Exam'}`,
                    `Draft a formal university-standard question paper.\nSubject: ${qpSubject}\nUnits: ${qpUnits}\nPattern: ${qpPattern}\nDifficulty: ${qpDifficulty}\nInclude:\n1. Clear section breakdown (Part A, Part B, Part C) with marks per question.\n2. Course Outcome (CO) and Bloom's Level tagging per question (e.g. CO2, K3).\n3. Complete step-by-step Answer Key and Marking Scheme at the end.`
                  )
                }
                disabled={isStreaming || !qpSubject.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Build Question Paper & Answer Key
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Quiz Generator */}
        <TabsContent value="quiz" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quiz Generator</CardTitle>
              <CardDescription className="text-xs">
                Creates multiple-choice, true/false, fill-in-the-blank, and short-answer questions with full explanations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Topic / Subtopic</label>
                  <Input
                    placeholder="e.g. A* Search and Heuristics"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Number of Questions</label>
                  <Input
                    type="number"
                    value={quizCount}
                    onChange={(e) => setQuizCount(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Question Types</label>
                  <Input
                    value={quizTypes}
                    onChange={(e) => setQuizTypes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'QUIZ',
                    `Quiz: ${quizTopic}`,
                    `Generate ${quizCount} high quality questions on ${quizTopic}.\nQuestion Types: ${quizTypes}.\nFor each question provide:\n- Question text\n- Options (if MCQ)\n- Correct Answer\n- Detailed Explanation\n- Difficulty Level (Easy, Medium, Hard)`
                  )
                }
                disabled={isStreaming || !quizTopic.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Draft Quiz
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Rubrics & Assignment Ideas */}
        <TabsContent value="rubric" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rubric & Assignment Idea Generator</CardTitle>
              <CardDescription className="text-xs">
                Creates project/assignment briefs with difficulty variations and comprehensive grading matrices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Subject / Topic</label>
                  <Input
                    placeholder="e.g. Relational Database Design: Hospital Management"
                    value={rubricTopic}
                    onChange={(e) => setRubricTopic(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Total Points</label>
                  <Input
                    value={rubricMaxMarks}
                    onChange={(e) => setRubricMaxMarks(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'RUBRIC',
                    `Rubric & Assignment: ${rubricTopic}`,
                    `Create an assignment brief and evaluation rubric for: ${rubricTopic}.\nMax Marks: ${rubricMaxMarks}.\nInclude:\n1. Assignment Objective and Problem Statement\n2. Three difficulty tiers (Core Requirements, Intermediate Extension, Advanced Challenge)\n3. Analytic Rubric Table (Criteria, Excellent, Good, Satisfactory, Poor, Points)`
                  )
                }
                disabled={isStreaming || !rubricTopic.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Rubric & Assignment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Lab & Viva */}
        <TabsContent value="lab-viva" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lab Experiment & Viva Question Generator</CardTitle>
              <CardDescription className="text-xs">
                Generates practical lab scenarios, troubleshooting prompts, and viva voce questions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Lab Experiment Topic</label>
                <Input
                  placeholder="e.g. Implementation of Dijkstra's Algorithm in C++"
                  value={labTopic}
                  onChange={(e) => setLabTopic(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'VIVA',
                    `Lab & Viva: ${labTopic}`,
                    `For the laboratory experiment "${labTopic}":\n1. Provide 2 realistic edge-case debugging challenges students will face.\n2. Generate 10 viva voce examination questions categorized into Basic (3), Intermediate (4), and Advanced Concept (3) with expected model answers.`
                  )
                }
                disabled={isStreaming || !labTopic.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Lab Exercises & Viva Questions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Slides & Explanations */}
        <TabsContent value="slides" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Worked Examples & Slide Deck Outline</CardTitle>
              <CardDescription className="text-xs">
                Creates slide-by-slide lecture presentation bullet points and multi-tier step-by-step examples.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Concept to Outline</label>
                <Input
                  placeholder="e.g. Memory Hierarchy and Cache Mapping Techniques"
                  value={workedExampleTopic}
                  onChange={(e) => setWorkedExampleTopic(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'SLIDE_OUTLINE',
                    `Slide Outline & Examples: ${workedExampleTopic}`,
                    `For the topic "${workedExampleTopic}":\n1. Produce a 7-slide presentation structure (Slide Title, Key Points, Visual Diagram Suggestion).\n2. Provide 1 fully worked step-by-step numerical/conceptual example.\n3. Provide a simplified intuitive analogy for struggling students and a deep technical insight for advanced students.`
                  )
                }
                disabled={isStreaming || !workedExampleTopic.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Create Presentation Outline & Examples
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Feedback & Grading Drafts */}
        <TabsContent value="feedback" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Feedback Draft & Short-Answer Marking Suggestions</CardTitle>
              <CardDescription className="text-xs">
                Suggests constructive feedback and objective marking criteria. The teacher always reviews and decides; never auto-applied.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Student Submission Text</label>
                <Textarea
                  placeholder="Paste student answer text here..."
                  value={feedbackStudentAnswer}
                  onChange={(e: any) => setFeedbackStudentAnswer(e.target.value)}
                  rows={4}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Question & Ideal Solution / Marking Points</label>
                <Input
                  placeholder="e.g. Explain Paging vs Segmentation with advantages (Max 5 marks)"
                  value={feedbackRubric}
                  onChange={(e) => setFeedbackRubric(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'FEEDBACK_DRAFT',
                    'Marking Suggestion & Student Feedback',
                    `Evaluate this student submission objectively against the marking criteria.\nCriteria: ${feedbackRubric}\nStudent Response: ${feedbackStudentAnswer}\nOutput:\n1. Key strengths identified.\n2. Key omissions or misconceptions.\n3. Suggested score out of max marks with justification.\n4. Constructive feedback note for the student.`
                  )
                }
                disabled={isStreaming || !feedbackStudentAnswer.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Draft Evaluation & Feedback
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Ask My Notes */}
        <TabsContent value="ask-notes" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ask My Notes (Classroom Document Assistant)</CardTitle>
              <CardDescription className="text-xs">
                Answers queries directly from your uploaded materials with exact citations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {classrooms.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Classroom Scope</label>
                  <Select value={selectedClassId} onValueChange={(val: any) => setSelectedClassId(val || '')}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select classroom" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name} ({c.subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Question to Search in Notes</label>
                <Input
                  placeholder="e.g. Which unit covers alpha-beta pruning and what theorems are referenced?"
                  value={notesQuery}
                  onChange={(e) => setNotesQuery(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'ASK_NOTES',
                    `Ask Notes: ${notesQuery}`,
                    `Question about curriculum notes: ${notesQuery}.\nProvide a verified answer strictly using textbook engineering references and cite specific concepts.`
                  )
                }
                disabled={isStreaming || !notesQuery.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Search & Synthesize from Notes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. Class Insights & Recap */}
        <TabsContent value="class-insight" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Class Insights & Stream Recap</CardTitle>
              <CardDescription className="text-xs">
                Generates a weekly review and recommendations on what to re-teach based on anonymous student performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Week / Period</label>
                  <Input
                    value={recapWeek}
                    onChange={(e) => setRecapWeek(e.target.value)}
                    className="text-xs"
                  />
                </div>
                {classrooms.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Classroom</label>
                    <Select value={selectedClassId} onValueChange={(val: any) => setSelectedClassId(val || '')}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select classroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {classrooms.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name} ({c.subject.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'CLASS_INSIGHT',
                    `Weekly Class Recap: ${recapWeek}`,
                    `Generate a friendly, encouraging Weekly Class Recap for the class stream (${recapWeek}).\nInclude:\n1. Key topics mastered this week.\n2. Common tricky points to review before next class.\n3. Upcoming milestone reminders.\n4. Encouraging note from the instructor.`
                  )
                }
                disabled={isStreaming || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Weekly Stream Recap
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 10. Meet Transcript Summarizer */}
        <TabsContent value="meet-summary" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Meet Transcript to Summary & Action Points</CardTitle>
              <CardDescription className="text-xs">
                Extracts key discussion takeaways, student doubts raised, and post-class action items.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Paste Meeting Transcript or Notes</label>
                <Textarea
                  placeholder="Paste live meeting transcript, chat log, or lecture notes here..."
                  value={meetTranscript}
                  onChange={(e: any) => setMeetTranscript(e.target.value)}
                  rows={5}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() =>
                  runStreamGeneration(
                    'MEET_SUMMARY',
                    'Live Meet Summary & Action Items',
                    `Analyze this live lecture transcript/log:\n${meetTranscript}\nGenerate:\n1. 3-sentence executive summary of the session.\n2. Major doubts/questions raised by students and their resolutions.\n3. Action items & assignments due for the next lecture.`
                  )
                }
                disabled={isStreaming || !meetTranscript.trim() || !aiStatus.isConfigured}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-xs"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Summarize Session & Extract Action Points
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 11. My AI Library */}
        <TabsContent value="library" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Saved AI Library</CardTitle>
                <CardDescription className="text-xs">
                  All lesson plans, question papers, and study resources you have saved.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {library.length} Items Saved
              </Badge>
            </CardHeader>
            <CardContent>
              {library.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground space-y-2">
                  <Bookmark className="h-8 w-8 mx-auto opacity-40 text-primary" />
                  <p className="text-sm font-semibold">Your AI Library is empty</p>
                  <p className="text-xs max-w-sm mx-auto">
                    When you generate lesson plans or questions using any tool above, click &quot;Save to Library&quot; to keep them here for future use.
                  </p>
                </div>
              ) : (
                <div className="divide-y border rounded-lg">
                  {library.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-3xs font-mono">
                            {item.tool}
                          </Badge>
                          <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                        </div>
                        <p className="text-2xs text-muted-foreground line-clamp-2">
                          {item.content.slice(0, 150)}...
                        </p>
                        <span className="text-3xs text-muted-foreground font-mono">
                          Saved on {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOutput(item.content);
                            setCurrentToolTitle(item.title);
                            setCurrentToolType(item.tool);
                          }}
                          className="h-7 text-2xs"
                        >
                          Load in Viewer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLibraryItem(item.id)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Output Viewer Section (Visible whenever output exists or is streaming) */}
      {(output || isStreaming) && (
        <AiOutputViewer
          toolTitle={currentToolTitle}
          toolType={currentToolType}
          output={output}
          isStreaming={isStreaming}
          onStop={handleStop}
          onUseInClass={(content) => {
            alert('Item loaded! You can now paste this directly into your classroom Stream or Question Bank.');
          }}
          useInClassLabel="Use in Classroom"
        />
      )}
    </div>
  );
}
