'use client';

import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseCsv, CSV_HEADERS } from '@/lib/csv';
import type { DaySettings, LineItem } from '@/types';

interface ImportCsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (items: LineItem[]) => Promise<void> | void;
  settings: DaySettings;
}

export function ImportCsvModal({ open, onOpenChange, onImported, settings }: ImportCsvModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const items = parseCsv(text, settings);
      if (items.length === 0) {
        setError('No rows detected in CSV file.');
        return;
      }
      await onImported(items);
      setError(null);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError('Failed to parse CSV. Please ensure it matches the expected format.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with the headers: {CSV_HEADERS.join(', ')}
          </DialogDescription>
        </DialogHeader>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
