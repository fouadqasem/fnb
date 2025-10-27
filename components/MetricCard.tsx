'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type MetricCardProps = {
  title: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
};

export function MetricCard({ title, value, hint, emphasize = false }: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  return (
    <Card className={cn('overflow-hidden border-border/60 bg-card/80 backdrop-blur')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {title}
          {hint ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground/70" />
                </TooltipTrigger>
                <TooltipContent>{hint}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn('text-3xl font-semibold tracking-tight transition-all duration-300', {
            'animate-metric-pulse text-primary': emphasize
          })}
        >
          {displayValue}
        </div>
      </CardContent>
    </Card>
  );
}
