'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FlashcardsPage() {
  const [flipped, setFlipped] = useState(false);
  
  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto flex flex-col items-center">
      <h1 className="text-3xl font-bold w-full text-left">Flashcards: Database Concepts</h1>
      
      <div 
        className={`w-full max-w-2xl h-96 cursor-pointer perspective-1000 relative`}
        onClick={() => setFlipped(!flipped)}
      >
        <Card className={`absolute w-full h-full inset-0 transition-all duration-500 [transform-style:preserve-3d] flex items-center justify-center p-8 text-center shadow-xl ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
           <div className={`absolute inset-0 flex items-center justify-center p-8 backface-hidden ${flipped ? 'opacity-0' : 'opacity-100'}`}>
              <h2 className="text-4xl font-bold">What is 1NF?</h2>
           </div>
           <div className={`absolute inset-0 flex items-center justify-center p-8 [transform:rotateY(180deg)] backface-hidden ${flipped ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-2xl">First Normal Form: Each column must contain atomic (indivisible) values and each row must be unique.</p>
           </div>
        </Card>
      </div>
      
      <p className="text-sm text-muted-foreground mt-4">Click card or press Space to flip.</p>

      {flipped && (
        <div className="flex gap-4 mt-8 w-full justify-center">
          <Button variant="destructive" className="flex-1 max-w-[120px]">1 - Hard</Button>
          <Button variant="secondary" className="flex-1 max-w-[120px]">2 - Good</Button>
          <Button variant="outline" className="flex-1 max-w-[120px]">3 - Easy</Button>
          <Button className="flex-1 max-w-[120px] bg-green-600 hover:bg-green-700">4 - Very Easy</Button>
        </div>
      )}
    </div>
  );
}
