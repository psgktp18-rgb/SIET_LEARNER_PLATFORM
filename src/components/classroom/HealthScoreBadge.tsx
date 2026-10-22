'use client';

import React, { useState } from 'react';
import { ClassroomHealthBreakdown } from '@/lib/classroom-health';
import { Activity, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface HealthScoreBadgeProps {
  health: ClassroomHealthBreakdown;
  size?: 'sm' | 'md' | 'lg';
}

export function HealthScoreBadge({ health, size = 'md' }: HealthScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!health) return null;

  const colorStyles = {
    Healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    Fair: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    'At Risk': 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  }[health.status];

  const dotStyles = {
    Healthy: 'bg-emerald-500',
    Fair: 'bg-amber-500',
    'At Risk': 'bg-rose-500',
  }[health.status];

  const Icon = {
    Healthy: CheckCircle,
    Fair: AlertTriangle,
    'At Risk': XCircle,
  }[health.status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center font-medium rounded-full border transition-colors shadow-2xs cursor-pointer ${colorStyles} ${sizeClasses}`}
        title="Click to view health score breakdown"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotStyles}`} />
        <span>{health.status}</span>
        <span className="font-bold opacity-90">{health.score}%</span>
      </button>

      {showTooltip && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 rounded-xl border border-border/80 bg-popover p-3.5 shadow-xl text-left text-xs text-popover-foreground animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5 font-semibold">
              <Icon className="h-4 w-4" />
              <span>Health Score Breakdown</span>
            </div>
            <span className="font-mono font-bold text-sm">{health.score}/100</span>
          </div>

          <div className="mt-2.5 space-y-2">
            <div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Attendance (30% weight)</span>
                <span className="font-medium text-foreground">{health.attendanceRate}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${health.attendanceRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Notes Uploaded (20% weight)</span>
                <span className="font-medium text-foreground">{health.notesCount} notes ({health.notesRate}%)</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${health.notesRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Assignments Graded (25% weight)</span>
                <span className="font-medium text-foreground">{health.assignmentsCount} created ({health.assignmentsRate}%)</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${health.assignmentsRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Active Students (25% weight)</span>
                <span className="font-medium text-foreground">{health.activeStudentsCount}/{health.totalEnrolled} ({health.activeStudentsRate}%)</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${health.activeStudentsRate}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
