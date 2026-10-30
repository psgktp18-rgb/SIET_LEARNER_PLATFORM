'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sparkles, Settings, ShieldAlert, RefreshCw } from 'lucide-react';

interface AiUnavailablePanelProps {
  status?: 'not_configured' | 'temporarily_unavailable' | 'exam_mode_blocked' | 'quota_exceeded';
  userRole?: string;
  reason?: string;
  onRetry?: () => void;
}

export function AiUnavailablePanel({
  status = 'not_configured',
  userRole = 'STUDENT',
  reason,
  onRetry,
}: AiUnavailablePanelProps) {
  const isAdmin = userRole.toUpperCase() === 'ADMIN';

  if (status === 'exam_mode_blocked') {
    return (
      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 max-w-xl mx-auto my-6 text-center">
        <CardContent className="p-6 space-y-3">
          <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
            AI Tools Paused During Exam Mode
          </h3>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 max-w-md mx-auto">
            College Exam Mode is currently active for ongoing tests. Student AI tutors, practice answer assistants, and code helpers are temporarily locked to maintain academic integrity.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'quota_exceeded') {
    return (
      <Card className="border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 max-w-xl mx-auto my-6 text-center">
        <CardContent className="p-6 space-y-3">
          <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-blue-900 dark:text-blue-200">
            Daily AI Quota Reached
          </h3>
          <p className="text-xs text-blue-800/80 dark:text-blue-300/80 max-w-md mx-auto">
            You have reached your daily quota for AI generations. Your quota will automatically reset at midnight.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'temporarily_unavailable') {
    return (
      <Card className="border-destructive/30 bg-destructive/5 max-w-xl mx-auto my-6 text-center">
        <CardContent className="p-6 space-y-3">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            AI is temporarily unavailable
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {reason || 'The configured AI model is taking longer to respond or experiencing a network timeout. Please retry in a few moments.'}
          </p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="gap-2 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Retry Request
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default: Not configured yet
  return (
    <Card className="border-dashed border-2 border-primary/30 bg-card max-w-xl mx-auto my-8 text-center shadow-xs">
      <CardContent className="p-8 space-y-4">
        <div className="h-12 w-12 rounded-full bg-secondary/30 text-primary flex items-center justify-center mx-auto">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">
            AI is not configured yet
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {reason || 'An AI engine (Google Gemini API key or local Ollama server) has not been connected to Lecture Lens yet.'}
          </p>
        </div>

        <div className="pt-2">
          {isAdmin ? (
            <Button nativeButton={false} render={<Link href="/admin/settings" className="gap-2 inline-flex items-center" />}>
              <Settings className="h-4 w-4" />
              <span>Configure AI in System Settings</span>
            </Button>
          ) : (
            <div className="p-3 bg-muted/40 rounded-lg inline-block border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Next Step: </span>
              Please contact your college administrator to configure an AI provider.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
