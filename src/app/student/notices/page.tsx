import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NoticesPage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Notice Board</h1>
        <div className="flex gap-2">
           <Button variant="outline">Filters</Button>
        </div>
      </div>

      <div className="grid gap-6">
         <Card>
            <CardHeader><CardTitle>Hackathon Registration</CardTitle></CardHeader>
            <CardContent>
               <p className="mb-4 text-muted-foreground">Join the annual college hackathon!</p>
               <Button>Register for Event</Button>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
