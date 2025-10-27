'use client';

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { DailySummary, LineItem } from '@/types';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface LineItemsGridProps {
  items: LineItem[];
  selectedId: string | null;
  summary: DailySummary;
  onSelect: (id: string | null) => void;
  onDraftChange: (id: string, field: keyof LineItem, value: string) => void;
  onCommitString: (id: string, field: keyof LineItem, value: string) => void;
  onCommitNumber: (id: string, field: keyof LineItem, value: number) => void;
}

export function LineItemsGrid({
  items,
  selectedId,
  summary,
  onSelect,
  onDraftChange,
  onCommitString,
  onCommitNumber
}: LineItemsGridProps) {
  const totals = useMemo(
    () => ({
      totalCost: formatCurrency(summary.totalCostJD),
      totalSales: formatCurrency(summary.totalSalesJD),
      parCst: formatCurrency(summary.parCstJD),
      totalImplied: formatCurrency(items.reduce((acc, item) => acc + item.impliedSalesJD, 0))
    }),
    [items, summary]
  );

  const renderNumericInput = (item: LineItem, field: keyof LineItem) => (
    <Input
      type="number"
      inputMode="decimal"
      step="0.001"
      value={Number.isFinite(item[field] as number) ? String(item[field] ?? '') : ''}
      onChange={(event) => {
        const value = event.target.value;
        onDraftChange(item.id, field, value);
      }}
      onBlur={(event) => {
        const value = parseFloat(event.target.value);
        onCommitNumber(item.id, field, Number.isFinite(value) ? Number(value.toFixed(3)) : 0);
      }}
    />
  );

  const warningBadge = (item: LineItem) => {
    const implied = item.impliedSalesJD;
    const sales = item.totalSalesJD;
    if (implied <= 0) return null;
    const diff = Math.abs(sales - implied) / implied;
    if (diff <= 0.1) return null;
    const direction = sales > implied ? 'above' : 'below';
    return (
      <Badge variant="secondary" className="ml-2 text-xs" title="Actual sales deviate more than 10% from implied sales">
        {Math.round(diff * 100)}% {direction}
      </Badge>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-card/70">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-left">Category</TableHead>
            <TableHead className="text-left">Menu Item</TableHead>
            <TableHead>Qty Nos.</TableHead>
            <TableHead>Unit Cost (JD)</TableHead>
            <TableHead>Unit Price (JD)</TableHead>
            <TableHead>Total Sales (JD)</TableHead>
            <TableHead>Line Cost (JD)</TableHead>
            <TableHead>Implied Sales (JD)</TableHead>
            <TableHead>Variance (JD)</TableHead>
            <TableHead>Variance (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                No items for this date — add your first item.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow
                key={item.id}
                data-state={selectedId === item.id ? 'selected' : undefined}
                className={cn('cursor-pointer', selectedId === item.id && 'bg-primary/10')}
                onClick={() => onSelect(item.id)}
              >
                <TableCell className="text-left">
                  <Input
                    value={item.category}
                    onChange={(event) => onDraftChange(item.id, 'category', event.target.value)}
                    onBlur={(event) => onCommitString(item.id, 'category', event.target.value.trim())}
                    className="text-left"
                  />
                </TableCell>
                <TableCell className="text-left">
                  <Input
                    value={item.menuItem}
                    onChange={(event) => onDraftChange(item.id, 'menuItem', event.target.value)}
                    onBlur={(event) => onCommitString(item.id, 'menuItem', event.target.value.trim())}
                    className="text-left"
                  />
                </TableCell>
                <TableCell>{renderNumericInput(item, 'qtyNos')}</TableCell>
                <TableCell>{renderNumericInput(item, 'unitCostJD')}</TableCell>
                <TableCell>{renderNumericInput(item, 'unitPriceJD')}</TableCell>
                <TableCell className="flex items-center justify-end">
                  {renderNumericInput(item, 'totalSalesJD')}
                  {warningBadge(item)}
                </TableCell>
                <TableCell>{formatNumber(item.lineCostJD)}</TableCell>
                <TableCell>{formatNumber(item.impliedSalesJD)}</TableCell>
                <TableCell className={cn(item.varianceValueJD < 0 ? 'text-destructive' : 'text-emerald-500')}>
                  {formatNumber(item.varianceValueJD)}
                </TableCell>
                <TableCell>{formatPercent(item.variancePct)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="text-left font-semibold" colSpan={5}>
              Totals
            </TableCell>
            <TableCell className="font-semibold">{totals.totalSales}</TableCell>
            <TableCell className="font-semibold">{totals.totalCost}</TableCell>
            <TableCell className="font-semibold">{totals.totalImplied}</TableCell>
            <TableCell className="font-semibold">{totals.parCst}</TableCell>
            <TableCell className="font-semibold">{formatPercent(summary.foodCostPct)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
