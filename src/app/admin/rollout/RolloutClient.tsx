'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';

export default function RolloutClient({ initialEnabledYears, departments }: any) {
  const router = useRouter();
  
  // Convert [3] to {"3": ["ALL"]} if it's an array
  let initialConfig = initialEnabledYears;
  if (Array.isArray(initialEnabledYears)) {
    initialConfig = {};
    initialEnabledYears.forEach((y: number) => {
      initialConfig[y.toString()] = ['ALL'];
    });
  }
  
  const [config, setConfig] = useState<any>(initialConfig);

  const toggleYearDept = (year: number, deptId: string) => {
    setConfig((prev: any) => {
      const yearConf = prev[year.toString()] || [];
      const newConf = { ...prev };
      
      if (deptId === 'ALL') {
        if (yearConf.includes('ALL')) {
          newConf[year.toString()] = [];
        } else {
          newConf[year.toString()] = ['ALL'];
        }
      } else {
        if (yearConf.includes('ALL')) {
          newConf[year.toString()] = departments.map((d:any) => d.id).filter((id:any) => id !== deptId);
        } else if (yearConf.includes(deptId)) {
          newConf[year.toString()] = yearConf.filter((id:string) => id !== deptId);
        } else {
          newConf[year.toString()] = [...yearConf, deptId];
          if (newConf[year.toString()].length === departments.length) {
            newConf[year.toString()] = ['ALL'];
          }
        }
      }
      return newConf;
    });
  }

  const save = async () => {
    const res = await fetch('/api/admin/rollout', {
      method: 'POST',
      body: JSON.stringify({ enabledYearsConfig: config }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      alert('Saved successfully');
      router.refresh();
    } else {
      alert('Failed to save');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Rollout Settings</h1>
      <Card className="p-6">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="py-2">Year</th>
              <th className="py-2">All Departments</th>
              {departments.map((d:any) => <th key={d.id} className="py-2">{d.code}</th>)}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map(year => {
              const conf = config[year.toString()] || [];
              const isAll = conf.includes('ALL');
              return (
                <tr key={year} className="border-t">
                  <td className="py-3">Year {year}</td>
                  <td className="py-3">
                    <Checkbox checked={isAll} onCheckedChange={() => toggleYearDept(year, 'ALL')} />
                  </td>
                  {departments.map((d:any) => (
                    <td key={d.id} className="py-3">
                      <Checkbox checked={isAll || conf.includes(d.id)} onCheckedChange={() => toggleYearDept(year, d.id)} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        <Button onClick={save} className="mt-6">Save Changes</Button>
      </Card>
    </div>
  )
}
