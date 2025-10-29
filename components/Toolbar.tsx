'use client';

import { useMemo, useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { ImportCsvModal } from '@/components/Modals/ImportCsvModal';
import { ConfirmClearModal } from '@/components/Modals/ConfirmClearModal';
import type { DaySettings, LineItem } from '@/types';
import { Download, Trash2, CopyPlus, PlusCircle, Upload, Eraser, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ToolbarOrientation = 'vertical' | 'horizontal' | 'responsive';

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
  orientation?: ToolbarOrientation;
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
  className,
  orientation = 'vertical'
}: ToolbarProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const actions = useMemo(
    () =>
      [
        { label: 'New record', icon: PlusCircle, onClick: onAdd, disabled: false, variant: 'default' as ButtonProps['variant'] },
        {
          label: 'Duplicate record',
          icon: CopyPlus,
          onClick: onDuplicate,
          disabled: disableDuplicate,
          variant: 'secondary' as ButtonProps['variant']
        },
        {
          label: 'Delete record',
          icon: Trash2,
          onClick: onDelete,
          disabled: disableDelete,
          variant: 'destructive' as ButtonProps['variant']
        },
        {
          label: 'Import CSV',
          icon: Upload,
          onClick: () => setImportOpen(true),
          disabled: false,
          variant: 'secondary' as ButtonProps['variant']
        },
        { label: 'Export CSV', icon: Download, onClick: onExport, disabled: false, variant: 'secondary' as ButtonProps['variant'] },
        { label: 'Clear day', icon: Eraser, onClick: () => setConfirmOpen(true), disabled: false, variant: 'outline' as ButtonProps['variant'] }
      ] satisfies Array<{
        label: string;
        icon: LucideIcon;
        onClick: () => void;
        disabled: boolean | undefined;
        variant: ButtonProps['variant'];
      }>,
    [disableDelete, disableDuplicate, onAdd, onDelete, onDuplicate, onExport, setConfirmOpen, setImportOpen]
  );

  const containerStyles: Record<ToolbarOrientation, string> = {
    vertical: 'flex flex-col gap-2 rounded-full',
    horizontal: 'flex flex-row gap-2 rounded-2xl',
    responsive: 'flex flex-row gap-2 rounded-2xl sm:flex-col sm:rounded-full'
  };

  const tooltipSide: Record<ToolbarOrientation, 'top' | 'left'> = {
    vertical: 'left',
    horizontal: 'top',
    responsive: 'top'
  };

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div className={cn('pointer-events-auto bg-background/95 p-2 shadow-lg backdrop-blur', containerStyles[orientation], className)}>
        {actions.map(({ label, icon: Icon, onClick, disabled, variant }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={variant}
                aria-label={label}
                onClick={() => {
                  if (typeof onClick === 'function') {
                    onClick();
                  }
                }}
                disabled={disabled}
                className={cn('h-12 w-12 rounded-full', disabled && 'opacity-60')}
              >
                <Icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide[orientation]}>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <ImportCsvModal open={importOpen} onOpenChange={setImportOpen} onImported={onImport} settings={settings} />
      <ConfirmClearModal open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={onClear} />
    </TooltipProvider>
  );
}
