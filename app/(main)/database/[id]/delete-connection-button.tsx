'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteDatabaseConnection } from '../actions';

export function DeleteConnectionButton({ connectionId, connectionTitle }: { connectionId: string; connectionTitle: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete \"${connectionTitle}\"? This removes the saved connection record, not the remote database itself.`
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteDatabaseConnection(connectionId);
        toast({
          title: 'Connection deleted',
          description: result.message,
        });
        router.push('/database');
      } catch (error: any) {
        toast({
          title: 'Delete failed',
          description: error?.message || 'Unable to delete connection.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Button onClick={handleDelete} disabled={isPending} variant="destructive" className="gap-2">
      <Trash2 className="h-4 w-4" />
      Delete connection
    </Button>
  );
}
