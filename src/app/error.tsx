'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production, not to browser console
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <div className="max-w-md p-8 border-4 border-secondary rounded-lg bg-card shadow-lg text-center">
        <h2 className="text-3xl font-bold text-primary mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">
          We experienced an unexpected issue. Please try again.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            onClick={() => reset()}
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2 bg-secondary text-secondary-foreground font-bold rounded hover:bg-secondary/90 transition-colors"
          >
            Go Home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
