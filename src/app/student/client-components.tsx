'use client';

import { FormDialog } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { joinClassroom, submitFeedback, toggleStudyBuddy } from './actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch'; // ensure this exists, else use input type=checkbox

export function JoinClassroomDialog() {
  const handleSubmit = async (formData: FormData) => {
    const result = await joinClassroom(formData);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
  };

  return (
    <FormDialog
      title="Join Classroom"
      description="Enter the join code provided by your teacher."
      trigger={<Button className="bg-secondary text-secondary-foreground hover:bg-[#d6c22c]">Join Classroom</Button>}
      onSubmit={handleSubmit}
      submitText="Join"
    >
      <div className="space-y-2">
        <Label htmlFor="joinCode">Join Code</Label>
        <Input id="joinCode" name="joinCode" required placeholder="e.g. CS101-2026" />
      </div>
    </FormDialog>
  );
}

export function FeedbackForm({ classroomId, subjectName }: { classroomId: string, subjectName: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    formData.append('classroomId', classroomId);
    
    const res = await submitFeedback(formData);
    if (!res.ok) {
      setError(res.error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return <div className="p-4 border border-green-200 bg-green-50 text-green-800 rounded-md">Thank you for your feedback!</div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
       <p className="text-muted-foreground">Please provide your anonymous feedback for {subjectName}.</p>
       {error && <div className="text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
       <textarea 
         name="comment"
         required
         className="w-full border rounded-md p-2 h-32" 
         placeholder="Your feedback..."
       ></textarea>
       <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Anonymous Feedback'}</Button>
    </form>
  );
}

export function StudyBuddyToggle({ initialOptIn }: { initialOptIn: boolean }) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setOptIn(checked);
    setLoading(true);
    const res = await toggleStudyBuddy({ optIn: checked });
    setLoading(false);
    if (!res.ok) {
      setOptIn(!checked); // revert on error
      alert(res.error.message);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input 
         type="checkbox" 
         id="opt-in" 
         className="w-4 h-4 accent-primary" 
         checked={optIn}
         onChange={handleChange}
         disabled={loading}
      />
      <Label htmlFor="opt-in" className="cursor-pointer">
        {loading ? 'Saving...' : 'Opt-in to Matchmaking'}
      </Label>
    </div>
  );
}
