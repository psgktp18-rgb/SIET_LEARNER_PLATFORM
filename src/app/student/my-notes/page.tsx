import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MyNotesPage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Notes</h1>
        <Button>Upload Note</Button>
      </div>

      <div className="grid gap-6">
         <Card>
            <CardContent className="p-4 flex justify-between items-center">
               <div>
                  <p className="font-bold">Operating Systems - Chapter 1</p>
                  <p className="text-sm text-muted-foreground">Private Note</p>
               </div>
               <div className="flex gap-2">
                  <Button size="sm" variant="outline">Share</Button>
                  <Button size="sm" variant="outline">Generate Flashcards</Button>
                  <Button size="sm" variant="secondary">Ask Bot</Button>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
