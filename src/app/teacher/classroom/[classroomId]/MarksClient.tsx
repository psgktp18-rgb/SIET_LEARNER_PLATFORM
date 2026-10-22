'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function MarksClient({ classroom, scheme, students: initialStudents, isLocked }: any) {
  const [students, setStudents] = useState(initialStudents);
  const [saving, setSaving] = useState(false);
  const [insight, setInsight] = useState('');

  const handleMarkChange = (studentId: string, compId: string, val: string) => {
    if (isLocked) return;
    const num = parseFloat(val);
    setStudents((prev: any) => prev.map((s: any) => {
      if (s.id === studentId) {
        return { ...s, marks: { ...s.marks, [compId]: isNaN(num) ? null : num } };
      }
      return s;
    }));
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/teacher/marks/${classroom.id}`, {
      method: 'POST',
      body: JSON.stringify({ students }),
      headers: { 'Content-Type': 'application/json' }
    });
    setSaving(false);
    if (res.ok) alert('Saved successfully');
    else alert('Failed to save');
  };

  const finalise = async () => {
    if (!confirm('Are you sure you want to finalise? You cannot edit marks after locking.')) return;
    const res = await fetch(`/api/teacher/marks/${classroom.id}/lock`, { method: 'POST' });
    if (res.ok) window.location.reload();
  };

  const loadInsight = async () => {
    setInsight('Loading...');
    const res = await fetch(`/api/teacher/marks/${classroom.id}/insight`);
    if (res.ok) {
      const data = await res.json();
      setInsight(data.insight);
    } else {
      setInsight('Failed to load insight.');
    }
  };

  return (
    <div>
      <div className="flex gap-4 mb-4">
        {!isLocked && <Button onClick={save} disabled={saving}>Save Draft</Button>}
        {!isLocked && <Button variant="destructive" onClick={finalise}>Finalise & Lock</Button>}
        {isLocked && <div className="text-red-500 font-bold flex items-center">🔒 Marks are locked</div>}
        <Button variant="outline" onClick={loadInsight}>Get AI Class Insight</Button>
      </div>

      {insight && (
        <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
          <h3 className="font-bold text-blue-800">AI Insight & What to Re-teach</h3>
          <p className="text-blue-900 mt-2">{insight}</p>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3">Reg No</th>
              <th className="p-3">Name</th>
              {scheme.components.map((c: any) => (
                <th key={c.id} className="p-3">{c.name} ({c.maxMarks})</th>
              ))}
              <th className="p-3 font-bold">Internal Total ({scheme.totalMaxMarks})</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s: any) => {
              let total = 0;
              scheme.components.forEach((c: any) => {
                const m = s.marks[c.id];
                // Assuming weightage is % of total marks, wait
                // For example, if maxMarks = 50, weightage = 20, totalMaxMarks = 100
                // Score 25/50 -> 50% -> 50% of 20 = 10 marks out of 100
                // So (m / c.maxMarks) * c.weightage / 100 * totalMaxMarks? No, usually weightage IS the mark out of 100.
                // Let's assume weightage is the max points that component contributes to the internal total.
                // So (m / c.maxMarks) * c.weightage
                if (m) total += (m / c.maxMarks) * c.weightage;
              });
              
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.loginId}</td>
                  <td className="p-3">{s.name}</td>
                  {scheme.components.map((c: any) => (
                    <td key={c.id} className="p-3">
                      {isLocked ? (
                        <span>{s.marks[c.id] || '-'}</span>
                      ) : (
                        <Input 
                          type="number" 
                          className="w-20 h-8"
                          value={s.marks[c.id] || ''} 
                          onChange={(e) => handleMarkChange(s.id, c.id, e.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="p-3 font-bold">{total.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
