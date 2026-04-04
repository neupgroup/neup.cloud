'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { checkDatabaseConnection } from '../actions';

export function CheckConnectionButton({ connectionId }: { connectionId: string }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheck = () => {
    startTransition(async () => {
      try {
        const result = await checkDatabaseConnection(connectionId);
        setStatusMessage(result.message);

        toast({
          title: result.success ? 'Connection healthy' : 'Connection failed',
          description: result.message,
          variant: result.success ? 'default' : 'destructive',
        });
      } catch (error: any) {
        const message = error?.message || 'Unable to check connection.';
        setStatusMessage(message);
        toast({
          title: 'Connection check failed',
          description: message,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleCheck} disabled={isPending} variant="outline" className="gap-2">
        {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Check for connection
      </Button>
      {statusMessage && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          {statusMessage.toLowerCase().includes('fail') ? (
            <AlertCircle className="h-4 w-4 mt-0.5 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
