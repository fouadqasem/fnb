'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DailySummary, LineItem } from '@/types';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { calcSummary } from '@/lib/calculations';

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
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groupedItems.forEach(([category]) => {
      initial[category] = true;
    });
    return initial;
  });

  useEffect(() => {
    setCollapsedCategories((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;

      groupedItems.forEach(([category]) => {
        const previousValue = prev[category];
        const value = previousValue ?? true;
        next[category] = value;
        if (value !== previousValue) {
          changed = true;
        }
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) {
        changed = true;
      } else {
        for (const key of prevKeys) {
          if (!(key in next)) {
            changed = true;
            break;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [groupedItems]);

  const categorySummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        summary: DailySummary;
        qtyTotal: number;
      }
    >();

    groupedItems.forEach(([category, group]) => {
      const categorySummary = calcSummary(group);
      const qtyTotal = group.reduce((acc, item) => acc + item.qtyNos, 0);
      map.set(category, { summary: categorySummary, qtyTotal });
    });

    return map;
  }, [groupedItems]);

  const totals = useMemo(() => {
    const totalCostOnPos = items.reduce((acc, item) => acc + item.costOnPosJD, 0);
    const totalCostVariance = items.reduce((acc, item) => acc + item.costVarianceJD, 0);
    return {
      totalSales: formatNumber(summary.totalSalesJD),
      totalCost: formatNumber(summary.totalCostJD),
      totalCostOnPos: formatNumber(totalCostOnPos),
      totalCostVariance: formatNumber(totalCostVariance),
      dayFoodCost: formatPercent(summary.foodCostPct),
      recipeFoodCost: formatPercent(summary.recipeFoodCostPct),
      variancePct: formatPercent(summary.variancePct),
      totalVariance: formatNumber(summary.totalVarianceJD)
    };
  }, [items, summary]);

  return (
    <div className="rounded-lg border bg-card/70">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="px-4 py-3 text-left">Menu Items</TableHead>
              <TableHead className="px-4 py-3 text-right">Qty</TableHead>
              <TableHead className="px-4 py-3 text-right">Unit Cost (JD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Selling Price (JD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Cost on POS (JD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Total Sales (JD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Total Cost (JD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Cost Variance (JD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Day Food Cost (%)</TableHead>
              <TableHead className="px-4 py-3 text-right">Recipe Food Cost (%)</TableHead>
              <TableHead className="px-4 py-3 text-right">Variance (%)</TableHead>
              <TableHead className="px-4 py-3 text-right">Total Variance (JD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Actions</TableHead>
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
              groupedItems.map(([category, group]) => {
                const isCollapsed = collapsedCategories[category] ?? true;
                const categoryData = categorySummaries.get(category);
                const toggleCategory = () => {
                  const nextCollapsed = !isCollapsed;
                  if (nextCollapsed && group.some((item) => item.id === selectedId)) {
                    onSelect(null);
                  }
                  setCollapsedCategories((prev) => ({ ...prev, [category]: nextCollapsed }));
                };

                const qtyTotal = categoryData?.qtyTotal ?? 0;
                const summaryTotals = categoryData?.summary;

                return (
                  <Fragment key={category}>
                    <TableRow
                      key={`category-${category}`}
                      className={cn(
                        'bg-muted/60 text-primary',
                        isCollapsed ? 'border-b border-border/60' : 'border-b border-border/40'
                      )}
                    >
                      <TableCell className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={toggleCategory}
                          className="flex w-full items-center gap-2 text-left"
                          aria-expanded={!isCollapsed}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="truncate">{category}</span>
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold">
                        {isCollapsed ? formatNumber(qtyTotal) : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-muted-foreground">
                        {isCollapsed ? '—' : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-muted-foreground">
                        {isCollapsed ? '—' : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold">
                        {isCollapsed && summaryTotals
                          ? formatNumber(summaryTotals.totalCostOnPosJD)
                          : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold">
                        {isCollapsed && summaryTotals
                          ? formatNumber(summaryTotals.totalSalesJD)
                          : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold">
                        {isCollapsed && summaryTotals
                          ? formatNumber(summaryTotals.totalCostJD)
                          : null}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'px-4 py-3 text-right font-semibold',
                          summaryTotals && summaryTotals.parCstJD > 0
                            ? 'text-destructive'
                            : summaryTotals && summaryTotals.parCstJD < 0
                            ? 'text-emerald-500'
                            : 'text-primary'
                        )}
                      >
                        {isCollapsed && summaryTotals
                          ? formatNumber(summaryTotals.parCstJD)
                          : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold">
                        {isCollapsed && summaryTotals
                          ? formatPercent(summaryTotals.foodCostPct, 1)
                          : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold">
                        {isCollapsed && summaryTotals
                          ? formatPercent(summaryTotals.recipeFoodCostPct, 1)
                          : null}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'px-4 py-3 text-right font-semibold',
                          summaryTotals && summaryTotals.variancePct > 0
                            ? 'text-destructive'
                            : summaryTotals && summaryTotals.variancePct < 0
                            ? 'text-emerald-500'
                            : 'text-primary'
                        )}
                      >
                        {isCollapsed && summaryTotals
                          ? formatPercent(summaryTotals.variancePct, 1)
                          : null}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'px-4 py-3 text-right font-semibold',
                          summaryTotals && summaryTotals.totalVarianceJD > 0
                            ? 'text-destructive'
                            : summaryTotals && summaryTotals.totalVarianceJD < 0
                            ? 'text-emerald-500'
                            : 'text-primary'
                        )}
                      >
                        {isCollapsed && summaryTotals
                          ? formatNumber(summaryTotals.totalVarianceJD)
                          : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right" />
                    </TableRow>
                    {!isCollapsed &&
                      group.map((item) => (
                        <TableRow
                          key={item.id}
                          data-state={selectedId === item.id ? 'selected' : undefined}
                          className={cn(
                            'cursor-pointer',
                            selectedId === item.id && 'bg-primary/10'
                          )}
                          onClick={() => onSelect(item.id)}
                        >
                          <TableCell className="px-4 py-3 text-left font-medium">
                            {item.menuItem || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {formatNumber(item.qtyNos)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {formatNumber(item.unitCostJD)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {formatNumber(item.unitPriceJD)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {formatNumber(item.costOnPosJD)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {formatNumber(item.totalSalesJD)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {formatNumber(item.totalCostJD)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'px-4 py-3 text-right',
                              item.costVarianceJD > 0
                                ? 'text-destructive'
                                : item.costVarianceJD < 0
                                ? 'text-emerald-500'
                                : undefined
                            )}
                          >
                            {formatNumber(item.costVarianceJD)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {formatPercent(item.dayFoodCostPct)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            {formatPercent(item.recipeFoodCostPct)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'px-4 py-3 text-right',
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
                              'px-4 py-3 text-right',
                              item.totalVarianceJD > 0
                                ? 'text-destructive'
                                : item.totalVarianceJD < 0
                                ? 'text-emerald-500'
                                : undefined
                            )}
                          >
                            {formatNumber(item.totalVarianceJD)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
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
                );
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="px-4 py-3 text-left font-semibold">Totals</TableCell>
              <TableCell className="px-4 py-3" />
              <TableCell className="px-4 py-3" />
              <TableCell className="px-4 py-3" />
              <TableCell className="px-4 py-3 text-right font-semibold">{totals.totalCostOnPos}</TableCell>
              <TableCell className="px-4 py-3 text-right font-semibold">{totals.totalSales}</TableCell>
              <TableCell className="px-4 py-3 text-right font-semibold">{totals.totalCost}</TableCell>
              <TableCell className="px-4 py-3 text-right font-semibold">{totals.totalCostVariance}</TableCell>
              <TableCell className="px-4 py-3 text-right font-semibold">{totals.dayFoodCost}</TableCell>
              <TableCell className="px-4 py-3 text-right font-semibold">{totals.recipeFoodCost}</TableCell>
              <TableCell className="px-4 py-3 text-right font-semibold">{totals.variancePct}</TableCell>
              <TableCell className="px-4 py-3 text-right font-semibold">{totals.totalVariance}</TableCell>
              <TableCell className="px-4 py-3" />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
