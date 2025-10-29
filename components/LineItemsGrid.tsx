'use client';

import { Fragment, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DailySummary, LineItem } from '@/types';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

interface LineItemsGridProps {
  items: LineItem[];
  selectedId: string | null;
  summary: DailySummary;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
}

export function LineItemsGrid({ items, selectedId, summary, onSelect, onEdit }: LineItemsGridProps) {
  const groupedItems = useMemo(() => {
    if (items.length === 0) return [] as Array<[string, LineItem[]]>;
    const sorted = [...items].sort((a, b) => {
      const aCategory = a.category?.trim().toLowerCase() ?? '';
      const bCategory = b.category?.trim().toLowerCase() ?? '';
      if (aCategory === bCategory) {
        return a.menuItem.localeCompare(b.menuItem, undefined, { sensitivity: 'base' });
      }
      return aCategory.localeCompare(bCategory, undefined, { sensitivity: 'base' });
    });
    const map = new Map<string, LineItem[]>();
    sorted.forEach((item) => {
      const key = item.category?.trim() ? item.category.trim() : 'Uncategorized';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  const totals = useMemo(() => {
    const totalCostOnPos = items.reduce((acc, item) => acc + item.costOnPosJD, 0);
    const totalCostVariance = items.reduce((acc, item) => acc + item.costVarianceJD, 0);
    return {
      totalSales: formatCurrency(summary.totalSalesJD),
      totalCost: formatCurrency(summary.totalCostJD),
      totalCostOnPos: formatCurrency(totalCostOnPos),
      totalCostVariance: formatCurrency(totalCostVariance),
      dayFoodCost: formatPercent(summary.foodCostPct),
      recipeFoodCost: formatPercent(summary.recipeFoodCostPct),
      variancePct: formatPercent(summary.variancePct),
      totalVariance: formatCurrency(summary.totalVarianceJD)
    };
  }, [items, summary]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card/70">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-left">Item Name</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Cost (JD)</TableHead>
            <TableHead className="text-right">Selling Price (JD)</TableHead>
            <TableHead className="text-right">Cost on POS (JD)</TableHead>
            <TableHead className="text-right">Total Sales (JD)</TableHead>
            <TableHead className="text-right">Total Cost (JD)</TableHead>
            <TableHead className="text-right">Cost Variance (JD)</TableHead>
            <TableHead className="text-right">Day Food Cost (%)</TableHead>
            <TableHead className="text-right">Recipe Food Cost (%)</TableHead>
            <TableHead className="text-right">Variance (%)</TableHead>
            <TableHead className="text-right">Total Variance (JD)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="py-12 text-center text-muted-foreground">
                No items for this date — add your first item.
              </TableCell>
            </TableRow>
          ) : (
            groupedItems.map(([category, group]) => (
              <Fragment key={category}>
                <TableRow key={`category-${category}`} className="bg-muted/40">
                  <TableCell colSpan={13} className="text-left text-sm font-semibold uppercase tracking-wide">
                    {category}
                  </TableCell>
                </TableRow>
                {group.map((item) => (
                  <TableRow
                    key={item.id}
                    data-state={selectedId === item.id ? 'selected' : undefined}
                    className={cn('cursor-pointer', selectedId === item.id && 'bg-primary/10')}
                    onClick={() => onSelect(item.id)}
                  >
                    <TableCell className="text-left font-medium">{item.menuItem || '—'}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.qtyNos)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitCostJD)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPriceJD)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.costOnPosJD)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalSalesJD)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalCostJD)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        item.costVarianceJD > 0
                          ? 'text-destructive'
                          : item.costVarianceJD < 0
                          ? 'text-emerald-500'
                          : undefined
                      )}
                    >
                      {formatCurrency(item.costVarianceJD)}
                    </TableCell>
                    <TableCell className="text-right">{formatPercent(item.dayFoodCostPct)}</TableCell>
                    <TableCell className="text-right">{formatPercent(item.recipeFoodCostPct)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        item.variancePct > 0
                          ? 'text-destructive'
                          : item.variancePct < 0
                          ? 'text-emerald-500'
                          : undefined
                      )}
                    >
                      {formatPercent(item.variancePct)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        item.totalVarianceJD > 0
                          ? 'text-destructive'
                          : item.totalVarianceJD < 0
                          ? 'text-emerald-500'
                          : undefined
                      )}
                    >
                      {formatCurrency(item.totalVarianceJD)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(item.id);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="text-left font-semibold">Totals</TableCell>
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell className="text-right font-semibold">{totals.totalCostOnPos}</TableCell>
            <TableCell className="text-right font-semibold">{totals.totalSales}</TableCell>
            <TableCell className="text-right font-semibold">{totals.totalCost}</TableCell>
            <TableCell className="text-right font-semibold">{totals.totalCostVariance}</TableCell>
            <TableCell className="text-right font-semibold">{totals.dayFoodCost}</TableCell>
            <TableCell className="text-right font-semibold">{totals.recipeFoodCost}</TableCell>
            <TableCell className="text-right font-semibold">{totals.variancePct}</TableCell>
            <TableCell className="text-right font-semibold">{totals.totalVariance}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
