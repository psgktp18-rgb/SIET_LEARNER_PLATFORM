'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RefreshCw, ShieldAlert, Bot, Upload, Calendar, ShieldCheck } from 'lucide-react';

export function SettingsClient({ settings: initial }: { settings: any }) {
  const [settings, setSettings] = useState(initial || {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const update = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const parseEnabledYears = (): number[] => {
    try {
      const parsed = JSON.parse(settings.enabledYears || '[3]');
      if (Array.isArray(parsed)) return parsed.map(Number);
      if (parsed && typeof parsed === 'object') {
        return Object.keys(parsed)
          .filter(k => Array.isArray(parsed[k]) ? parsed[k].length > 0 : Boolean(parsed[k]))
          .map(Number);
      }
      return [3];
    } catch {
      return [3];
    }
  };

  const toggleYear = (year: number) => {
    const years = parseEnabledYears();
    const updated = years.includes(year) ? years.filter(y => y !== year) : [...years, year].sort();
    update('enabledYears', JSON.stringify(updated));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const enabledYears = parseEnabledYears();
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeName: settings.collegeName,
          academicYear: settings.academicYear,
          attendanceThreshold: parseFloat(settings.attendanceThreshold),
          aiMasterSwitch: settings.aiMasterSwitch,
          enabledYears,
          maxUploadSizeMB: parseInt(settings.maxUploadSizeMB),
          aiPrimaryProvider: settings.aiPrimaryProvider,
          ollamaChatModel: settings.ollamaChatModel,
          examMode: settings.examMode,
          themePrimaryColor: settings.themePrimaryColor,
          classroomCreationRule: settings.classroomCreationRule || 'ADMIN_HOD_TEACHER',
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettings(data.settings);
      showMsg('Settings saved successfully!');
    } catch (e: any) {
      showMsg(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const enabledYears = parseEnabledYears();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global settings for Lecture Lens</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-500" /> General</CardTitle>
          <CardDescription>College identity and academic year settings</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>College Name</Label>
            <Input
              value={settings.collegeName || ''}
              onChange={e => update('collegeName', e.target.value)}
              placeholder="e.g. Sri Shakthi Institute..."
            />
          </div>
          <div className="grid gap-2">
            <Label>Academic Year</Label>
            <Input
              value={settings.academicYear || ''}
              onChange={e => update('academicYear', e.target.value)}
              placeholder="e.g. 2024-2025"
            />
          </div>
          <div className="grid gap-2">
            <Label>Theme Primary Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={settings.themePrimaryColor || '#0f4c3a'}
                onChange={e => update('themePrimaryColor', e.target.value)}
                className="w-14 h-10 p-1 cursor-pointer"
              />
              <Input
                value={settings.themePrimaryColor || '#0f4c3a'}
                onChange={e => update('themePrimaryColor', e.target.value)}
                placeholder="#0f4c3a"
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security: Classroom Creation Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" /> Security: Classroom Creation
          </CardTitle>
          <CardDescription>Configure who is authorized to create classrooms in Lecture Lens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 max-w-lg">
            <Label>Who can create classrooms</Label>
            <select
              value={settings.classroomCreationRule || 'ADMIN_HOD_TEACHER'}
              onChange={e => update('classroomCreationRule', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ADMIN_ONLY">Admin only (Both Official & Extra classes)</option>
              <option value="ADMIN_HOD">Admin + HOD (Official by admin, extra classes by HOD)</option>
              <option value="ADMIN_HOD_TEACHER">Admin + Teachers (Official by admin, extra classes by HOD and Teachers)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Official classrooms are created by Administrator or requested by HOD with Admin approval. Extra classes (remedial, revision, lab batches, project groups) adhere to this setting.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rollout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-yellow-500" /> Rollout & Attendance</CardTitle>
          <CardDescription>Control which years can access the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-3 block">Years Enabled for Login</Label>
            <div className="flex gap-3">
              {[1, 2, 3, 4].map(year => (
                <button
                  key={year}
                  type="button"
                  onClick={() => toggleYear(year)}
                  className={`rounded-lg border-2 px-5 py-3 text-sm font-semibold transition-colors ${
                    enabledYears.includes(year)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  Year {year}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Selected years: {enabledYears.length ? enabledYears.map(y => `Year ${y}`).join(', ') : 'None'}</p>
          </div>
          <div className="grid gap-2 max-w-xs">
            <Label>Attendance Threshold (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={settings.attendanceThreshold ?? 75}
              onChange={e => update('attendanceThreshold', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum % required to pass attendance</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" /> AI Configuration</CardTitle>
          <CardDescription>Configure AI providers and models</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => update('aiMasterSwitch', !settings.aiMasterSwitch)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none ${settings.aiMasterSwitch ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.aiMasterSwitch ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <Label>AI Features Master Switch {settings.aiMasterSwitch ? '(ON)' : '(OFF)'}</Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Primary AI Provider</Label>
              <select
                value={settings.aiPrimaryProvider || 'ollama'}
                onChange={e => update('aiPrimaryProvider', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="gemini">Gemini (Google)</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Ollama Chat Model</Label>
              <Input
                value={settings.ollamaChatModel || ''}
                onChange={e => update('ollamaChatModel', e.target.value)}
                placeholder="e.g. llama3.2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-orange-500" /> Upload & Exam Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Max Upload Size (MB)</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={settings.maxUploadSizeMB ?? 50}
              onChange={e => update('maxUploadSizeMB', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 justify-center">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update('examMode', !settings.examMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.examMode ? 'bg-red-500' : 'bg-muted-foreground/30'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.examMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <Label>Exam Mode {settings.examMode ? '(Active — AI limited)' : '(Off)'}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
