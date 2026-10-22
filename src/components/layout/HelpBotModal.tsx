'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Bot, User, HelpCircle, CheckCircle2 } from 'lucide-react';

interface HelpBotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
}

interface Message {
  sender: 'bot' | 'user';
  text: string;
}

const FAQ_SUGGESTIONS: Record<string, string[]> = {
  TEACHER: [
    'How do I create an extra class?',
    'Where is the AI Studio located?',
    'How do I assign a co-teacher or substitute?',
    'What is the attendance threshold?',
  ],
  STUDENT: [
    'How do I join a class with a code?',
    'Where do I access the AI Tutor?',
    'How does the attendance predictor work?',
    'How do I earn points on the leaderboard?',
  ],
  HOD: [
    'How do I request an official classroom?',
    'Where can I view department marks finalisation?',
    'How do I assign a substitute teacher?',
  ],
  ADMIN: [
    'How do I configure who can create classrooms?',
    'Where do I manage AI provider settings?',
    'How do I bulk import students or teachers?',
  ],
};

export function HelpBotModal({ open, onOpenChange, userRole }: HelpBotModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: `Hello! I am your Lecture Lens Campus Assistant. Ask me anything about using the portal, rules, attendance requirements, or features!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestions = FAQ_SUGGESTIONS[userRole.toUpperCase()] || FAQ_SUGGESTIONS.STUDENT;

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'platformHelpBot',
          messages: [
            {
              role: 'system',
              content: `You are the friendly, helpful AI platform guide for "Lecture Lens" at Sri Shakthi Institute of Engineering and Technology (SIET). User role: ${userRole}. Help them understand portal navigation, rules, attendance policies (75% mandatory), AI Studio tools, marks finalisation, and classrooms. Answer concisely and clearly in 2-3 sentences.`,
            },
            ...messages.map((m) => ({
              role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
              content: m.text,
            })),
            { role: 'user', content: textToSend },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error('Platform bot error');
      }

      // Read SSE stream or text
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let botReply = '';

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
                if (parsed.text) botReply += parsed.text;
              } catch {}
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: botReply || 'Here to help! You can find everything in the 7-item hub navigation on your left.' },
      ]);
    } catch {
      // Graceful fallback answer if AI is not configured or offline
      let answer = 'For navigation, use the sidebar items on your left. All major actions like Classrooms, AI Studio, and Marks are readily accessible.';
      if (textToSend.toLowerCase().includes('class')) {
        answer = 'You can manage and view your classrooms from the "Classrooms" tab in your sidebar. If you have no classes, you can create an extra class or join with a 6-character code.';
      } else if (textToSend.toLowerCase().includes('ai')) {
        answer = 'Teachers can open the "AI Studio" from the sidebar for lesson plans, quizzes, and rubrics. Students can click "AI Tutor" for 24/7 concept explanations.';
      } else if (textToSend.toLowerCase().includes('attendance')) {
        answer = 'Anna University and SIET policy mandates minimum 75% attendance in each course. The attendance predictor helps you track how many sessions you can safely miss.';
      }
      setMessages((prev) => [...prev, { sender: 'bot', text: answer }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden flex flex-col h-[520px]">
        <DialogHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-secondary text-primary flex items-center justify-center font-bold">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base text-secondary font-bold">Lecture Lens Help Assistant</DialogTitle>
              <p className="text-2xs text-primary-foreground/80">SIET Campus Portal Support · Online</p>
            </div>
          </div>
          <Badge variant="outline" className="text-secondary border-secondary/50 text-2xs">
            {userRole}
          </Badge>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 text-xs ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'bot' && (
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  m.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-card border text-card-foreground shadow-xs rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 text-xs text-muted-foreground items-center">
              <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
              <span>Assistant is typing...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="p-2 border-t bg-muted/30 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 3).map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-2xs bg-card hover:bg-accent border px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t bg-card flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="text-xs h-9"
          />
          <Button type="submit" size="sm" disabled={loading || !input.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
