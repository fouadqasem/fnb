'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RestaurantSwitcher } from '@/components/RestaurantSwitcher';
import { MetricCard } from '@/components/MetricCard';
import { Toolbar } from '@/components/Toolbar';
import { LineItemsGrid } from '@/components/LineItemsGrid';
import { DayList } from '@/components/DayList';
import { useAuthUser } from '@/lib/auth';
import { useTheme } from 'next-themes';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SUMMARY,
  archiveRestaurant,
  clearDay,
  createRestaurant,
  deleteItem,
  getDay$,
  importItems,
  listActiveRestaurants$,
  listRecentDays$,
  renameRestaurant,
  upsertItem
} from '@/lib/firestore';
import { calcDerivedForItem, calcSummary } from '@/lib/calculations';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { DailySummary, DaySettings, LineItem, LineItemInput, Restaurant } from '@/types';
import { exportCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEYS = {
  restaurant: 'fnb_currentRestaurantId',
  date: 'fnb_selectedDate'
} as const;

const numericEditableFields = new Set<keyof LineItemInput>(['qtyNos', 'unitCostJD', 'unitPriceJD', 'totalSalesJD']);

function toLineItemInput(item: LineItem): LineItemInput {
  return {
    id: item.id,
    category: item.category,
    menuItem: item.menuItem,
    qtyNos: item.qtyNos,
    unitCostJD: item.unitCostJD,
    unitPriceJD: item.unitPriceJD,
    totalSalesJD: item.totalSalesJD
  };
}

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuthUser();
  const { theme, setTheme } = useTheme();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return new Date().toISOString().slice(0, 10);
    }
    return window.localStorage.getItem(STORAGE_KEYS.date) ?? new Date().toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<LineItem[]>([]);
  const [summary, setSummary] = useState<DailySummary>({ ...DEFAULT_SUMMARY });
  const [settings, setSettings] = useState<DaySettings>({ ...DEFAULT_SETTINGS });
  const [recentDays, setRecentDays] = useState<{ date: string; summary: DailySummary }[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedRestaurant = window.localStorage.getItem(STORAGE_KEYS.restaurant);
    if (storedRestaurant) {
      setCurrentRestaurantId(storedRestaurant);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = listActiveRestaurants$((list) => {
      setRestaurants(list);
      if (list.length === 0) {
        setCurrentRestaurantId(null);
        return;
      }
      setCurrentRestaurantId((prev) => {
        if (prev && list.some((restaurant) => restaurant.id === prev)) {
          return prev;
        }
        return list[0]?.id ?? null;
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentRestaurantId) {
        window.localStorage.setItem(STORAGE_KEYS.restaurant, currentRestaurantId);
      }
      if (selectedDate) {
        window.localStorage.setItem(STORAGE_KEYS.date, selectedDate);
      }
    }
  }, [currentRestaurantId, selectedDate]);

  useEffect(() => {
    if (!currentRestaurantId || !selectedDate) return;
    setLoadingDay(true);
    const unsubscribe = getDay$(currentRestaurantId, selectedDate, ({ items, summary, settings }) => {
      setItems(items);
      setSummary(summary);
      setSettings(settings);
      setLoadingDay(false);
      setSelectedItemId(null);
    });

    return () => unsubscribe();
  }, [currentRestaurantId, selectedDate]);

  useEffect(() => {
    if (!currentRestaurantId) {
      setRecentDays([]);
      return;
    }
    const unsubscribe = listRecentDays$(currentRestaurantId, (days) => {
      setRecentDays(days);
    });
    return () => unsubscribe();
  }, [currentRestaurantId]);

  const handleDraftChange = useCallback(
    (id: string, field: keyof LineItem, value: string) => {
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== id) return item;
          const input: LineItemInput = {
            ...toLineItemInput(item)
          };
          if (numericEditableFields.has(field as keyof LineItemInput)) {
            const parsed = parseFloat(value);
            if (field === 'qtyNos' || field === 'unitCostJD' || field === 'unitPriceJD' || field === 'totalSalesJD') {
              input[field] = Number.isFinite(parsed) ? parsed : 0;
            }
          } else if (field === 'category' || field === 'menuItem') {
            input[field] = value;
          }
          return calcDerivedForItem(input, settings);
        });
        setSummary(calcSummary(next));
        return next;
      });
    },
    [settings]
  );

  const commitUpdate = useCallback(
    async (id: string, overrides: Partial<LineItemInput>) => {
      if (!currentRestaurantId) return;
      const current = items.find((item) => item.id === id);
      if (!current) return;
      const payload: LineItemInput = {
        ...toLineItemInput(current),
        ...overrides
      };
      await upsertItem(currentRestaurantId, selectedDate, payload, settings, items);
    },
    [currentRestaurantId, items, selectedDate, settings]
  );

  const handleCommitString = useCallback(
    (id: string, field: keyof LineItem, value: string) => {
      void commitUpdate(id, { [field]: value } as Partial<LineItemInput>);
    },
    [commitUpdate]
  );

  const handleCommitNumber = useCallback(
    (id: string, field: keyof LineItem, value: number) => {
      void commitUpdate(id, { [field]: value } as Partial<LineItemInput>);
    },
    [commitUpdate]
  );

  const handleAddRow = async () => {
    if (!currentRestaurantId) return;
    const newId = crypto.randomUUID();
    const base: LineItemInput = {
      id: newId,
      category: '',
      menuItem: '',
      qtyNos: 0,
      unitCostJD: 0,
      unitPriceJD: 0,
      totalSalesJD: 0
    };
    const derived = calcDerivedForItem(base, settings);
    setItems((prev) => {
      const next = [...prev, derived];
      setSummary(calcSummary(next));
      return next;
    });
    setSelectedItemId(newId);
    await upsertItem(currentRestaurantId, selectedDate, base, settings, items);
  };

  const handleDuplicateRow = async () => {
    if (!currentRestaurantId || !selectedItemId) return;
    const target = items.find((item) => item.id === selectedItemId);
    if (!target) return;
    const newId = crypto.randomUUID();
    const base: LineItemInput = {
      ...toLineItemInput(target),
      id: newId
    };
    const derived = calcDerivedForItem(base, settings);
    setItems((prev) => {
      const next = [...prev, derived];
      setSummary(calcSummary(next));
      return next;
    });
    setSelectedItemId(newId);
    await upsertItem(currentRestaurantId, selectedDate, base, settings, items);
  };

  const handleDeleteRow = async () => {
    if (!currentRestaurantId || !selectedItemId) return;
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== selectedItemId);
      setSummary(calcSummary(next));
      return next;
    });
    await deleteItem(currentRestaurantId, selectedDate, selectedItemId, items);
    setSelectedItemId(null);
  };

  const handleClearDay = async () => {
    if (!currentRestaurantId) return;
    await clearDay(currentRestaurantId, selectedDate, items.map((item) => item.id));
    setItems([]);
    setSummary({ ...DEFAULT_SUMMARY });
    setSelectedItemId(null);
  };

  const handleImport = async (newItems: LineItem[]) => {
    if (!currentRestaurantId) return;
    const combined = [...items, ...newItems];
    setItems(combined);
    setSummary(calcSummary(combined));
    await importItems(currentRestaurantId, selectedDate, newItems, settings, items);
  };

  const handleExport = () => {
    const csv = exportCsv(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-food-cost-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleImplied = async (value: boolean) => {
    if (!currentRestaurantId) return;
    const newSettings = { ...settings, useImpliedSalesWhenBlank: value };
    const recalculated = items.map((item) => calcDerivedForItem({ ...toLineItemInput(item) }, newSettings));
    setSettings(newSettings);
    setItems(recalculated);
    setSummary(calcSummary(recalculated));
    await importItems(currentRestaurantId, selectedDate, recalculated, newSettings, items);
  };

  const metrics = useMemo(
    () => [
      {
        title: 'Daily Food Cost %',
        value: formatPercent(summary.foodCostPct, 1),
        hint: 'Total Cost ÷ Total Sales × 100',
        emphasize: true
      },
      {
        title: 'Total Sales (JD)',
        value: formatCurrency(summary.totalSalesJD)
      },
      {
        title: 'Total Cost (JD)',
        value: formatCurrency(summary.totalCostJD)
      },
      {
        title: 'Par Cst (JD)',
        value: formatCurrency(summary.parCstJD)
      }
    ],
    [summary]
  );

  const userLabel = useMemo(() => {
    if (authLoading) return 'Signing in…';
    if (!user) return 'Not signed in';
    return user.isAnonymous ? 'Anonymous session' : user.email ?? 'Authenticated';
  }, [authLoading, user]);

  return (
    <main className="container mx-auto max-w-7xl space-y-6 py-8">
      <header className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">Daily Food Cost Worksheet</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <RestaurantSwitcher
              restaurants={restaurants}
              currentRestaurantId={currentRestaurantId}
              onSelect={(id) => setCurrentRestaurantId(id)}
              onCreate={async (name) => {
                const newId = await createRestaurant(name);
                setCurrentRestaurantId(newId);
              }}
              onRename={renameRestaurant}
              onArchive={archiveRestaurant}
            />
            <div className="flex items-center gap-2">
              <label className="text-sm" htmlFor="date-picker">
                Date
              </label>
              <input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3"
              />
            </div>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {userLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Toggle theme
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <Toolbar
        settings={settings}
        onAdd={handleAddRow}
        onDuplicate={handleDuplicateRow}
        onDelete={handleDeleteRow}
        onImport={handleImport}
        onExport={handleExport}
        onClear={handleClearDay}
        onToggleImplied={handleToggleImplied}
        disableDuplicate={!selectedItemId}
        disableDelete={!selectedItemId}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className={cn('relative', loadingDay && 'opacity-60 pointer-events-none')}>
            {loadingDay ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : null}
            <LineItemsGrid
              items={items}
              selectedId={selectedItemId}
              summary={summary}
              onSelect={(id) => setSelectedItemId(id)}
              onDraftChange={handleDraftChange}
              onCommitString={handleCommitString}
              onCommitNumber={handleCommitNumber}
            />
          </div>
        </div>
        <DayList days={recentDays} activeDate={selectedDate} onSelect={setSelectedDate} />
      </div>
    </main>
  );
}
