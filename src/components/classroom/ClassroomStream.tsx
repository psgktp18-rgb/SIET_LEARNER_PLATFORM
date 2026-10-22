'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Megaphone, Send, UserCheck, ShieldAlert, Clock, Sparkles } from 'lucide-react';

interface ClassroomStreamProps {
  classroomId: string;
  initialAnnouncements: any[];
  canPost: boolean;
  isClassRep: boolean;
  userRoleName?: string;
}

export function ClassroomStream({
  classroomId,
  initialAnnouncements,
  canPost,
  isClassRep,
  userRoleName,
}: ClassroomStreamProps) {
  const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAnnouncements(prev => [data.announcement, ...prev]);
      setTitle('');
      setContent('');
      setMsg({ text: 'Announcement posted to class stream!', type: 'success' });
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setMsg({ text: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Post announcement box (if authorized) */}
      {canPost && (
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Post to Class Stream
              </CardTitle>
              {isClassRep && (
                <Badge variant="secondary" className="gap-1 text-2xs bg-amber-100 text-amber-800 border-amber-300">
                  <UserCheck className="h-3 w-3" /> Class Rep Announcement Rights
                </Badge>
              )}
              {!isClassRep && userRoleName && (
                <Badge variant="outline" className="text-2xs">
                  {userRoleName}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {msg && (
              <div className={`mb-3 p-2.5 rounded text-xs font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {msg.text}
              </div>
            )}
            <form onSubmit={handlePost} className="space-y-3">
              <div>
                <Input
                  placeholder="Announcement Title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="text-sm font-medium"
                  required
                />
              </div>
              <div>
                <textarea
                  rows={3}
                  placeholder={
                    isClassRep
                      ? 'Share notes, coordinate study groups, or relay class information (will be marked "From Class Rep")...'
                      : 'Share an update, schedule change, or study reminder with the class...'
                  }
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={loading} className="gap-2">
                  <Send className="h-3.5 w-3.5" />
                  {loading ? 'Posting...' : 'Post Announcement'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Announcements Stream List */}
      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No stream activity"
          description="No announcements or updates have been posted to this classroom yet."
        />
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const isCR = ann.isFromClassRep;
            return (
              <Card
                key={ann.id}
                className={`border shadow-2xs transition-all ${
                  isCR ? 'border-amber-200 bg-amber-50/20' : 'border-border/80'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {isCR ? (
                          <Badge variant="secondary" className="gap-1 text-2xs bg-amber-100 text-amber-900 border-amber-300 font-bold">
                            <UserCheck className="h-3 w-3" /> From Class Rep
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-2xs font-semibold">
                            Instructor Announcement
                          </Badge>
                        )}
                        <span className="text-2xs text-muted-foreground">
                          {new Date(ann.createdAt).toLocaleDateString()} at {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-foreground">{ann.title}</h4>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      By {ann.author?.name}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {ann.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
