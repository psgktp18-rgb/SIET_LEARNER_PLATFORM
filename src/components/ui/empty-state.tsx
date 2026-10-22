'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/50 p-8 text-center sm:p-12 ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-sm">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link href={action.href}>
              <Button className="gap-2 shadow-sm">
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button onClick={action.onClick} className="gap-2 shadow-sm">
              {ActionIcon && <ActionIcon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
