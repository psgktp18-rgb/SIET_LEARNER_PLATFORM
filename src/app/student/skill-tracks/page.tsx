import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SkillTracksPage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Skill Tracks</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
            <CardHeader><CardTitle>Aptitude Track</CardTitle></CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground mb-4">Prepare for placement aptitude tests.</p>
               <Button>Continue Track</Button>
            </CardContent>
         </Card>
         
         <Card>
            <CardHeader><CardTitle>Department Core (CSE)</CardTitle></CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground mb-4">Master core CSE concepts.</p>
               <Button variant="outline">Start Track</Button>
            </CardContent>
         </Card>
      </div>

      <Card>
         <CardHeader><CardTitle>Track Leaderboard</CardTitle></CardHeader>
         <CardContent>
            <p className="text-muted-foreground">You are currently ranked #15 in Aptitude Track.</p>
         </CardContent>
      </Card>
    </div>
  );
}
