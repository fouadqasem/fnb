'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { DailySummary } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DayListProps {
  days: { date: string; summary: DailySummary }[];
  activeDate: string;
  onSelect: (date: string) => void;
}

export function DayList({ days, activeDate, onSelect }: DayListProps) {
  return (
    <div className="rounded-lg border bg-card/80 p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Recent days</h3>
      <ScrollArea className="h-48">
        <div className="flex flex-col gap-2 pr-2">
          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent days yet.</p>
          ) : (
            days.map((day) => (
              <button
                key={day.date}
                onClick={() => onSelect(day.date)}
                className={cn(
                  'flex w-full flex-col rounded-md border px-3 py-3 text-left transition-colors hover:border-primary hover:bg-primary/10',
                  activeDate === day.date ? 'border-primary bg-primary/10' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{day.date}</span>
                  <Badge variant="secondary">{formatPercent(day.summary.foodCostPct)}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>Total Sales: {formatCurrency(day.summary.totalSalesJD)}</span>
                  <span>Cost Variance: {formatCurrency(day.summary.parCstJD)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
