'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ImportCsvModal } from '@/components/Modals/ImportCsvModal';
import { ConfirmClearModal } from '@/components/Modals/ConfirmClearModal';
import type { DaySettings, LineItem } from '@/types';
import { Download, Trash2, CopyPlus, PlusCircle, Upload } from 'lucide-react';

interface ToolbarProps {
  settings: DaySettings;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onImport: (items: LineItem[]) => Promise<void>;
  onExport: () => void;
  onClear: () => Promise<void>;
  onToggleImplied: (value: boolean) => void;
  disableDuplicate?: boolean;
  disableDelete?: boolean;
}

export function Toolbar({
  settings,
  onAdd,
  onDuplicate,
  onDelete,
  onImport,
  onExport,
  onClear,
  onToggleImplied,
  disableDuplicate,
  disableDelete
}: ToolbarProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card/80 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onAdd} className="gap-2">
          <PlusCircle className="h-4 w-4" /> Add row
        </Button>
        <Button variant="outline" onClick={onDuplicate} disabled={disableDuplicate} className="gap-2">
          <CopyPlus className="h-4 w-4" /> Duplicate row
        </Button>
        <Button variant="destructive" onClick={onDelete} disabled={disableDelete} className="gap-2">
          <Trash2 className="h-4 w-4" /> Delete row
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
        <Button variant="outline" onClick={onExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button variant="outline" onClick={() => setConfirmOpen(true)} className="gap-2">
          <Trash2 className="h-4 w-4" /> Clear day
        </Button>
      </div>
      <Switch
        id="toggle-implied"
        aria-label="Toggle implied sales autofill"
        checked={settings.useImpliedSalesWhenBlank}
        onCheckedChange={(checked) => onToggleImplied(Boolean(checked))}
      />
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
