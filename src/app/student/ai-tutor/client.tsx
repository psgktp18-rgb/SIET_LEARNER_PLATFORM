'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles,
  Send,
  Square,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Globe,
  Bell,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BookMarked,
  User,
  Bot,
} from 'lucide-react';
import { AiUnavailablePanel } from '@/components/ai/AiUnavailablePanel';

const TUTOR_MODES = [
  { id: 'SIMPLE', label: 'Explain Simply', promptRule: 'Explain in simple, high-clarity concepts suitable for rapid understanding.' },
  { id: 'STEP_BY_STEP', label: 'Step by Step', promptRule: 'Walk through step-by-step with clear numbered stages and logical reasoning.' },
  { id: 'EXAMPLE', label: 'Give an Example', promptRule: 'Ground the concept primarily with a concrete, realistic engineering application example.' },
  { id: 'ANALOGY', label: 'Analogy', promptRule: 'Use an everyday intuitive analogy to illuminate how this technical mechanism operates.' },
  { id: 'SOCRATIC', label: 'Socratic Mode', promptRule: 'Do not just give the direct answer; guide the student with thoughtful questions so they discover the solution.' },
  { id: 'TAMIL', label: 'Tamil (தமிழ்)', promptRule: 'Explain clearly in Tamil language (தமிழ்) while preserving standard English technical terminology.' },
  { id: 'TANGLISH', label: 'Tanglish', promptRule: 'Explain in conversational Tanglish (Tamil-English blend) while strictly keeping all technical terms in English.' },
];

interface ClassroomItem {
  id: string;
  name: string;
  subject: { name: string; code: string };
  notes: { id: string; title: string; unit?: string | null }[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isGeneralKnowledge?: boolean;
  citations?: string[];
  notInNotes?: boolean;
  notifiedTeacher?: boolean;
}

interface StudentAiTutorClientProps {
  classrooms: ClassroomItem[];
  aiStatus: { isConfigured: boolean; provider: string; reason?: string };
  pastConversations: any[];
  studentName: string;
}

export function StudentAiTutorClient({
  classrooms,
  aiStatus,
  pastConversations,
  studentName,
}: StudentAiTutorClientProps) {
  const [selectedMode, setSelectedMode] = useState('SIMPLE');
  const [selectedClassId, setSelectedClassId] = useState<string>('GENERAL');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${studentName}! I am your AI Study Tutor at SIET. Choose any explanation mode above (like Step by Step, Analogy, or Tanglish) and ask me any question!`,
      isGeneralKnowledge: true,
    },
  ]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedClass = classrooms.find((c) => c.id === selectedClassId);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isStreaming) return;

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    const newMessages: Message[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: query },
    ];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    const modeObj = TUTOR_MODES.find((m) => m.id === selectedMode) || TUTOR_MODES[0];
    const isClassContext = selectedClassId !== 'GENERAL' && !!selectedClass;

    const systemPrompt = isClassContext
      ? `You are an AI Tutor for the course "${selectedClass.subject.name} (${selectedClass.subject.code})". Mode: ${modeObj.label}. Constraint: ${modeObj.promptRule}. If the question is outside the scope of typical university syllabus for this course, you must state: "This concept is not present in your class curriculum notes. Would you like me to notify your teacher?"`
      : `You are an AI Study Tutor for engineering college students. Mode: ${modeObj.label}. Constraint: ${modeObj.promptRule}. Provide helpful, accurate academic explanations.`;

    // Add empty assistant message to stream into
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        isGeneralKnowledge: !isClassContext,
      },
    ]);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          tool: 'STUDY_TUTOR',
          prompt: query,
          systemPrompt,
          classroomId: isClassContext ? selectedClassId : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get tutor response');
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
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: m.content + parsed.text,
                            notInNotes:
                              isClassContext &&
                              (m.content + parsed.text).toLowerCase().includes('not present in your class'),
                          }
                        : m
                    )
                  );
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content || `[Error: ${err.message || 'AI is temporarily unavailable'}]` }
              : m
          )
        );
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

  const notifyTeacher = async (msgId: string, question: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch('/api/student/doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedClass.id,
          question,
          botContext: `Student asked during AI Tutor session: "${question}"`,
        }),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, notifiedTeacher: true } : m))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const quickQuestions = [
    'Explain the difference between TCP and UDP',
    'How does backpropagation work in neural networks?',
    'What is ACID property in database transactions?',
    'Explain deadlock prevention techniques',
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4 flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" /> AI Study Tutor
            </h1>
            <Badge variant="outline" className="text-3xs font-mono">
              Engine: {aiStatus.provider}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            24/7 personalized academic coaching. Works with or without classroom enrollment.
          </p>
        </div>

        {/* Classroom Context Selector */}
        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold text-muted-foreground whitespace-nowrap">Study Context:</span>
          <Select value={selectedClassId} onValueChange={(val: any) => setSelectedClassId(val || 'GENERAL')}>
            <SelectTrigger className="text-xs h-8 w-56">
              <SelectValue placeholder="Select context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL" className="text-xs">
                General Knowledge (All Subjects)
              </SelectItem>
              {classrooms.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name} ({c.subject.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!aiStatus.isConfigured && (
        <AiUnavailablePanel status="not_configured" userRole="STUDENT" reason={aiStatus.reason} />
      )}

      {/* Mode Switcher Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <span className="text-2xs font-semibold text-muted-foreground mr-1 shrink-0">Mode:</span>
        {TUTOR_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMode(m.id)}
            className={`text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
              selectedMode === m.id
                ? 'bg-primary text-secondary font-bold border-primary shadow-xs'
                : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-3.5 p-4 rounded-xl border bg-card/60 shadow-inner">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-primary text-secondary flex items-center justify-center font-bold shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl p-3.5 space-y-2 ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none shadow-xs'
                  : 'bg-muted/30 border text-card-foreground rounded-bl-none shadow-xs'
              }`}
            >
              {/* Badges for assistant message */}
              {m.role === 'assistant' && (
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {m.isGeneralKnowledge ? (
                    <Badge variant="outline" className="text-3xs text-muted-foreground border-dashed">
                      General Knowledge (Not from verified class notes)
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-3xs bg-secondary/30 text-amber-900 border-amber-300">
                      Class Notes Context: {selectedClass?.subject.code}
                    </Badge>
                  )}
                </div>
              )}

              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap">
                {m.content}
              </div>

              {/* Notify Teacher Button if not in class notes */}
              {m.notInNotes && selectedClass && (
                <div className="mt-2 pt-2 border-t border-dashed flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-2xs text-amber-800 font-medium">
                    Concept missing from uploaded notes?
                  </span>
                  {m.notifiedTeacher ? (
                    <Badge variant="outline" className="text-2xs text-green-700 bg-green-50 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Teacher Notified
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => notifyTeacher(m.id, messages[messages.length - 2]?.content || '')}
                      className="h-7 text-2xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                    >
                      <Bell className="h-3 w-3" /> Notify Teacher (Submit Doubt)
                    </Button>
                  )}
                </div>
              )}

              {/* Thumbs Feedback */}
              {m.role === 'assistant' && m.content && (
                <div className="flex items-center justify-end gap-1.5 pt-1 text-muted-foreground text-3xs">
                  <button className="hover:text-foreground p-0.5" title="Helpful">
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button className="hover:text-foreground p-0.5" title="Needs improvement">
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-secondary text-primary flex items-center justify-center font-bold shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-primary font-mono animate-pulse">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            AI Tutor is formulating explanation...
          </div>
        )}
      </div>

      {/* Suggested Quick Questions */}
      {messages.length <= 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
          <span className="text-3xs text-muted-foreground font-semibold shrink-0">Try asking:</span>
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-2xs bg-muted/40 hover:bg-accent border px-2 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 border rounded-lg p-1.5 bg-card shrink-0"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask any concept, question, or problem... (e.g. explain Dijkstra algorithm in step by step)"
          className="border-0 shadow-none focus-visible:ring-0 text-xs h-9 bg-transparent"
          disabled={!aiStatus.isConfigured}
        />

        {isStreaming ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleStop}
            className="h-8 text-xs gap-1"
          >
            <Square className="h-3 w-3" /> Stop
          </Button>
        ) : (
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || !aiStatus.isConfigured}
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
        )}
      </form>
    </div>
  );
}
