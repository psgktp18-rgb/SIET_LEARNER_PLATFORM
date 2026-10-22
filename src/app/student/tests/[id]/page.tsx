'use client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, AlertCircle } from 'lucide-react';

export default function LiveTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center shadow-md sticky top-0 z-10">
         <div className="font-bold text-xl">Mid Term Exam - CSE101</div>
         <div className="flex items-center gap-4 text-lg font-mono font-bold bg-white/20 px-4 py-1 rounded-full">
            Time Left: 44:59 (Server Time)
         </div>
         <Button variant="destructive" size="sm">Submit Exam</Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
         {/* Navigator */}
         <aside className="w-64 border-r bg-white p-4 overflow-y-auto hidden md:block">
            <h3 className="font-bold mb-4">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
               {Array.from({length: 20}).map((_, i) => (
                  <button key={i} className={`w-8 h-8 rounded-md text-xs font-bold border flex items-center justify-center ${i === 0 ? 'bg-primary text-white' : i === 2 ? 'bg-yellow-400 text-black' : 'bg-white'}`}>
                     {i + 1}
                  </button>
               ))}
            </div>
            <div className="mt-8 space-y-2 text-sm">
               <div className="flex items-center gap-2"><div className="w-4 h-4 bg-primary rounded-sm"></div> Current</div>
               <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400 rounded-sm"></div> Flagged</div>
               <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-sm"></div> Answered</div>
            </div>
         </aside>

         {/* Main Question Area */}
         <main className="flex-1 p-8 overflow-y-auto">
            <Alert className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Tab Switch Warning</AlertTitle>
               <AlertDescription>Navigating away from this tab will be recorded as a violation.</AlertDescription>
            </Alert>

            <Alert className="mb-6 bg-red-50 border-red-200 text-red-800 hidden">
               <ShieldAlert className="h-4 w-4" />
               <AlertTitle>Offline Banner</AlertTitle>
               <AlertDescription>You are offline. Answers are being autosaved locally.</AlertDescription>
            </Alert>

            <Card className="max-w-3xl mx-auto shadow-lg">
               <CardHeader className="bg-muted/50 border-b">
                  <div className="flex justify-between items-center">
                     <CardTitle>Question 1</CardTitle>
                     <span className="text-sm font-bold text-muted-foreground">+2 Marks</span>
                  </div>
               </CardHeader>
               <CardContent className="p-6 text-lg">
                  <p className="mb-8">What is the output of the following C code?</p>
                  <pre className="bg-black text-green-400 p-4 rounded-md mb-8 text-sm">
                     {`#include <stdio.h>\nint main() {\n  printf("Hello");\n  return 0;\n}`}
                  </pre>

                  <div className="space-y-3">
                     {['Hello', 'Hello\\n', 'Compilation Error', 'Runtime Error'].map((opt, i) => (
                        <label key={i} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                           <input type="radio" name="q1" className="w-5 h-5 accent-primary" />
                           <span>{opt}</span>
                        </label>
                     ))}
                  </div>
               </CardContent>
               <CardFooter className="bg-muted/50 border-t p-4 flex justify-between">
                  <Button variant="outline">Previous</Button>
                  <div className="flex gap-2">
                     <Button variant="secondary">Flag for Review</Button>
                     <Button>Save & Next</Button>
                  </div>
               </CardFooter>
            </Card>
         </main>
      </div>
    </div>
  );
}
