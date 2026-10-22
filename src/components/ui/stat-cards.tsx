'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';

export interface StatItem {
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
}

interface StatCardsProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export function StatCards({ stats, columns = 4, className = '' }: StatCardsProps) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  }[columns];

  return (
    <div className={`grid gap-4 ${colClass} ${className}`}>
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="relative overflow-hidden border border-border/70 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                {Icon && (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</span>
                {stat.badge && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    stat.badgeVariant === 'destructive'
                      ? 'bg-destructive/10 text-destructive'
                      : stat.badgeVariant === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : stat.badgeVariant === 'success'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {stat.badge}
                  </span>
                )}
              </div>
              {stat.description && (
                <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
