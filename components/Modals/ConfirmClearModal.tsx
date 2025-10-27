'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmClearModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmClearModal({ open, onOpenChange, onConfirm }: ConfirmClearModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear this day?</DialogTitle>
          <DialogDescription>
            This will permanently delete all line items for the selected date. You cannot undo this action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
          >
            Clear day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
