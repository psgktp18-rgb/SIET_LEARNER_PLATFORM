'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { testAiConnection } from './actions';

export function TestConnectionButton({ providerName }: { providerName: string }) {
  const [status, setStatus] = useState<{ loading: boolean, result?: any }>({ loading: false });

  const handleTest = async () => {
    setStatus({ loading: true });
    const res = await testAiConnection(providerName);
    setStatus({ loading: false, result: res });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={handleTest} disabled={status.loading} className="w-fit">
        {status.loading ? 'Testing...' : `Test ${providerName} Connection`}
      </Button>
      {status.result && (
        <div className={`text-sm p-2 rounded border ${status.result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {status.result.success ? (
            <>Success! Latency: <strong>{status.result.latency}ms</strong>. Response: "{status.result.response}"</>
          ) : (
            <>Failed: {status.result.error}</>
          )}
        </div>
      )}
    </div>
  );
}
