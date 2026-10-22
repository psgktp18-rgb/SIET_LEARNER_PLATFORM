import { useState } from 'react';
import { useToast } from '@/hooks/use-toast'; // standard shadcn toast

export function useAction<TInput, TOutput>(
  action: (input: TInput) => Promise<{ ok: boolean; data?: TOutput; error?: any; requestId: string }>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; fieldErrors?: any } | null>(null);
  const { toast } = useToast();

  const execute = async (input: TInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await action(input);
      if (result.ok) {
        toast({ title: 'Success', description: 'Action completed successfully.' });
        return result.data;
      } else {
        setError(result.error);
        toast({ title: 'Error', description: result.error?.message || 'An error occurred.', variant: 'destructive' });
        return null;
      }
    } catch (err: any) {
      setError({ message: err.message });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}
