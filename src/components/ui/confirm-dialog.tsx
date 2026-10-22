'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import { Input } from './input';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText?: string;
  requireTypedConfirmation?: string;
  onConfirm: () => Promise<void>;
  trigger: React.ReactNode;
}

export function ConfirmDialog({ title, description, confirmText = 'Confirm', requireTypedConfirmation, onConfirm, trigger }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || !!(requireTypedConfirmation && typed !== requireTypedConfirmation);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireTypedConfirmation && (
          <div className="my-4 space-y-2">
            <p className="text-sm font-medium">Type <strong>{requireTypedConfirmation}</strong> to confirm:</p>
            <Input value={typed} onChange={e => setTyped(e.target.value)} disabled={loading} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isButtonDisabled}>
            {loading ? 'Saving...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
