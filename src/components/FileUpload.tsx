'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileUploadProps {
  onUploadSuccess: (url: string, fileType: string) => void;
  folderPath?: string; // Kept for API compatibility, not strictly needed anymore
  purpose?: string;
  classroomId?: string;
}

export function FileUpload({ onUploadSuccess, purpose = 'general', classroomId }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError('');
    setProgress(10); // Fake initial progress

    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);
    if (classroomId) formData.append('classroomId', classroomId);

    try {
      // For real progress we'd use XMLHttpRequest, but fetch is fine for now
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.error?.message || 'Upload failed');
      }

      const data = await res.json();
      setProgress(100);
      setIsUploading(false);
      onUploadSuccess(data.data.url, file.type);
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-card">
      <input 
        type="file" 
        onChange={handleFileChange}
        disabled={isUploading}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
      />
      
      {file && !isUploading && progress === 0 && (
        <Button onClick={handleUpload} className="w-full">
          Upload {file.name}
        </Button>
      )}

      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-center text-muted-foreground">{Math.round(progress)}% uploaded</p>
        </div>
      )}

      {progress === 100 && !isUploading && (
        <p className="text-sm text-green-600 font-medium">Upload successful!</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
