'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImportCsvModal } from '@/components/Modals/ImportCsvModal';
import { ConfirmClearModal } from '@/components/Modals/ConfirmClearModal';
import type { DaySettings, LineItem } from '@/types';
import { Download, Trash2, CopyPlus, PlusCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  settings: DaySettings;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onImport: (items: LineItem[]) => Promise<void>;
  onExport: () => void;
  onClear: () => Promise<void>;
  disableDuplicate?: boolean;
  disableDelete?: boolean;
  className?: string;
}

export function Toolbar({
  settings,
  onAdd,
  onDuplicate,
  onDelete,
  onImport,
  onExport,
  onClear,
  disableDuplicate,
  disableDelete,
  className
}: ToolbarProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className={cn('flex h-full flex-col gap-3 rounded-lg border bg-card/80 p-4 backdrop-blur', className)}>
      <div className="flex flex-col gap-2">
        <Button onClick={onAdd} className="w-full justify-start gap-2">
          <PlusCircle className="h-4 w-4" /> Add row
        </Button>
        <Button variant="outline" onClick={onDuplicate} disabled={disableDuplicate} className="w-full justify-start gap-2">
          <CopyPlus className="h-4 w-4" /> Duplicate row
        </Button>
        <Button variant="destructive" onClick={onDelete} disabled={disableDelete} className="w-full justify-start gap-2">
          <Trash2 className="h-4 w-4" /> Delete row
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)} className="w-full justify-start gap-2">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
        <Button variant="outline" onClick={onExport} className="w-full justify-start gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button variant="outline" onClick={() => setConfirmOpen(true)} className="w-full justify-start gap-2">
          <Trash2 className="h-4 w-4" /> Clear day
        </Button>
      </div>
      <ImportCsvModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={onImport}
        settings={settings}
      />
      <ConfirmClearModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={onClear}
      />
    </div>
  );
}
