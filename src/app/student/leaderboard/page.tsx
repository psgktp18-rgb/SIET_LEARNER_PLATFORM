import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LeaderboardPage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <Button variant="outline">Hide my name</Button>
      </div>

      <Tabs defaultValue="class">
         <TabsList>
            <TabsTrigger value="class">Class</TabsTrigger>
            <TabsTrigger value="dept">Department</TabsTrigger>
            <TabsTrigger value="college">College</TabsTrigger>
         </TabsList>
         
         <TabsContent value="class" className="mt-6">
            <Card className="bg-yellow-50 border-yellow-200 shadow-lg relative overflow-hidden">
               <CardHeader className="text-center pb-2 z-10 relative">
                  <CardTitle className="text-yellow-800 text-2xl">Podium</CardTitle>
               </CardHeader>
               <CardContent className="flex justify-center items-end gap-4 h-48 z-10 relative">
                  <div className="flex flex-col items-center">
                     <div className="w-12 h-12 bg-gray-300 rounded-full border-2 border-gray-400"></div>
                     <p className="font-bold text-gray-700 mt-2">Alice</p>
                     <div className="w-16 h-24 bg-gray-300 rounded-t-lg mt-2 flex items-center justify-center font-bold text-gray-600 text-2xl">2</div>
                  </div>
                  <div className="flex flex-col items-center -translate-y-4">
                     <div className="w-16 h-16 bg-yellow-400 rounded-full border-4 border-yellow-500"></div>
                     <p className="font-bold text-yellow-800 mt-2">You</p>
                     <div className="w-20 h-32 bg-yellow-400 rounded-t-lg mt-2 flex items-center justify-center font-bold text-yellow-700 text-4xl">1</div>
                  </div>
                  <div className="flex flex-col items-center">
                     <div className="w-12 h-12 bg-amber-600 rounded-full border-2 border-amber-700"></div>
                     <p className="font-bold text-amber-800 mt-2">Bob</p>
                     <div className="w-16 h-20 bg-amber-600 rounded-t-lg mt-2 flex items-center justify-center font-bold text-amber-900 text-2xl">3</div>
                  </div>
               </CardContent>
            </Card>

            <div className="mt-8 space-y-2">
               <div className="flex justify-between items-center p-4 border rounded-lg bg-background">
                  <div className="flex items-center gap-4">
                     <span className="font-bold text-lg w-6 text-center">4</span>
                     <div className="w-8 h-8 bg-muted rounded-full"></div>
                     <span className="font-medium cursor-pointer hover:underline">Charlie</span>
                  </div>
                  <span className="font-mono text-muted-foreground">980 XP</span>
               </div>
            </div>
         </TabsContent>
      </Tabs>
    </div>
  );
}
