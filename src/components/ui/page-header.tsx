import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getRoutesForRole } from '@/lib/routes';

export function PageHeader({ 
  title, 
  description, 
  action, 
  actions,
  role, 
  currentPath 
}: { 
  title: string, 
  description?: string, 
  action?: React.ReactNode, 
  actions?: React.ReactNode,
  role?: string, 
  currentPath?: string 
}) {
  const effectiveAction = actions || action;
  const routes = role ? getRoutesForRole(role) : [];
  const route = currentPath ? routes.find(r => currentPath.startsWith(r.href)) : null;
  
  return (
    <div className="mb-6 space-y-4">
      {role && (
        <nav className="flex items-center text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-1">
            <li>
              <Link href={`/${role.toLowerCase()}`} className="hover:text-foreground">
                {role.charAt(0) + role.slice(1).toLowerCase()}
              </Link>
            </li>
            {(route as any)?.group && (
              <>
                <ChevronRight className="h-4 w-4" />
                <li>
                  <span className="cursor-default">{(route as any).group}</span>
                </li>
              </>
            )}
            <ChevronRight className="h-4 w-4" />
            <li>
              <span className="font-medium text-foreground">{title}</span>
            </li>
          </ol>
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        {effectiveAction && (
          <div className="shrink-0">
            {effectiveAction}
          </div>
        )}
      </div>
    </div>
  );
}
