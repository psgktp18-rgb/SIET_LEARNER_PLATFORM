import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function ProfilePage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <Button>Export Skill Profile PDF</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
            <CardHeader><CardTitle>Level & XP</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div className="flex justify-between">
                  <span className="font-bold">Level 12</span>
                  <span className="text-muted-foreground">1200 / 1500 XP</span>
               </div>
               <Progress value={80} />
            </CardContent>
         </Card>

         <Card>
            <CardHeader><CardTitle>Streak</CardTitle></CardHeader>
            <CardContent className="flex justify-between items-center">
               <div>
                  <p className="text-3xl font-bold text-orange-500 flex items-center gap-2">🔥 14 Days</p>
                  <p className="text-sm text-muted-foreground mt-2">1 Streak Freeze Available</p>
               </div>
               <Button variant="outline">Use Freeze</Button>
            </CardContent>
         </Card>
      </div>

      <Card>
         <CardHeader><CardTitle>Badges & Certificates</CardTitle></CardHeader>
         <CardContent>
            <div className="flex gap-4">
               <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center text-2xl" title="First Quiz">🎯</div>
               <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center text-2xl" title="Perfect Score">⭐</div>
               <div className="w-16 h-16 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-2xl opacity-50" title="100 Days Streak (Locked)">🔥</div>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
