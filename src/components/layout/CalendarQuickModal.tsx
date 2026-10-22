'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarQuickModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function CalendarQuickModal({ open, onOpenChange, userRole }: CalendarQuickModalProps) {
  const [selectedDay, setSelectedDay] = useState('Mon');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="bg-primary text-primary-foreground p-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-secondary" />
            <DialogTitle className="text-base text-secondary font-bold">Academic Schedule & Timetable</DialogTitle>
          </div>
          <p className="text-2xs text-primary-foreground/80 mt-0.5">
            Current Semester · Academic Year 2023-2024
          </p>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Day Selector */}
          <div className="flex rounded-md border p-1 bg-muted/40 gap-1">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                  selectedDay === d
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                {d}
                {today.startsWith(d) && (
                  <span className="ml-1 text-3xs text-secondary underline font-bold">Today</span>
                )}
              </button>
            ))}
          </div>

          {/* Schedule list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="p-3 border rounded-lg bg-card flex items-center justify-between text-xs hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary font-mono text-2xs font-bold text-center">
                  09:00<br/>09:50
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Artificial Intelligence & ML</h4>
                  <p className="text-2xs text-muted-foreground">CS3491 · Lecture Hall 302</p>
                </div>
              </div>
              <Badge variant="outline" className="text-2xs text-primary">Period 1</Badge>
            </div>

            <div className="p-3 border rounded-lg bg-card flex items-center justify-between text-xs hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary font-mono text-2xs font-bold text-center">
                  10:00<br/>10:50
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Database Management Systems</h4>
                  <p className="text-2xs text-muted-foreground">CS3492 · Lab 4</p>
                </div>
              </div>
              <Badge variant="outline" className="text-2xs text-primary">Period 2</Badge>
            </div>

            <div className="p-3 border rounded-lg bg-card flex items-center justify-between text-xs hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-secondary/30 text-amber-900 font-mono text-2xs font-bold text-center">
                  11:10<br/>12:00
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Design & Analysis of Algorithms</h4>
                  <p className="text-2xs text-muted-foreground">CS3401 · Smart Class 2</p>
                </div>
              </div>
              <Badge variant="outline" className="text-2xs text-amber-800">Period 3</Badge>
            </div>
          </div>
        </div>

        <div className="border-t p-3 bg-muted/20 flex justify-between items-center text-2xs text-muted-foreground">
          <span>75% attendance minimum enforced</span>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs h-7">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
