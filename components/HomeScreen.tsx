'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RestaurantSwitcher } from '@/components/RestaurantSwitcher';
import { MetricCard } from '@/components/MetricCard';
import { Toolbar } from '@/components/Toolbar';
import { LineItemsGrid } from '@/components/LineItemsGrid';
import { DayList } from '@/components/DayList';
import { LineItemForm, type LineItemDraft } from '@/components/LineItemForm';
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

function toDraft(item: LineItem): LineItemDraft {
  return {
    id: item.id,
    category: item.category,
    menuItem: item.menuItem,
    qtyNos: item.qtyNos !== undefined ? String(item.qtyNos) : '',
    unitCostJD: item.unitCostJD !== undefined ? String(item.unitCostJD) : '',
    unitPriceJD: item.unitPriceJD !== undefined ? String(item.unitPriceJD) : '',
    costOnPosJD: item.costOnPosJD !== undefined ? String(item.costOnPosJD) : '',
    totalSalesJD: item.totalSalesJD !== undefined ? String(item.totalSalesJD) : ''
  };
}

function createEmptyDraft(): LineItemDraft {
  return {
    id: crypto.randomUUID(),
    category: '',
    menuItem: '',
    qtyNos: '',
    unitCostJD: '',
    unitPriceJD: '',
    costOnPosJD: '',
    totalSalesJD: ''
  };
}

function parseNumeric(value: string) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(3)) : 0;
}

function draftToInput(draft: LineItemDraft): LineItemInput {
  return {
    id: draft.id || crypto.randomUUID(),
    category: draft.category.trim(),
    menuItem: draft.menuItem.trim(),
    qtyNos: parseNumeric(draft.qtyNos),
    unitCostJD: parseNumeric(draft.unitCostJD),
    unitPriceJD: parseNumeric(draft.unitPriceJD),
    costOnPosJD: parseNumeric(draft.costOnPosJD),
    totalSalesJD: parseNumeric(draft.totalSalesJD)
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
  const [draft, setDraft] = useState<LineItemDraft>(() => createEmptyDraft());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  const currentRestaurant = useMemo(() => {
    if (!currentRestaurantId) return null;
    return restaurants.find((restaurant) => restaurant.id === currentRestaurantId) ?? null;
  }, [currentRestaurantId, restaurants]);

  const pageTitle = useMemo(() => {
    const name = currentRestaurant?.name?.trim();
    return `Food Cost for ${name && name.length > 0 ? name : '—'}`;
  }, [currentRestaurant]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.title = pageTitle;
  }, [pageTitle]);

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
      setEditingItemId(null);
      setDraft(createEmptyDraft());
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

  const handleDraftTextChange = useCallback((field: 'category' | 'menuItem', value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleDraftNumberChange = useCallback(
    (
      field: Exclude<keyof LineItemDraft, 'category' | 'menuItem' | 'id'>,
      value: string
    ) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmitDraft = useCallback(async () => {
    if (!currentRestaurantId) return;
    const base = draftToInput(draft);
    const id = editingItemId ?? base.id ?? crypto.randomUUID();
    const payload: LineItemInput = { ...base, id };
    const derived = calcDerivedForItem(payload, settings);
    const nextItems = items.filter((item) => item.id !== id).concat(derived);
    setItems(nextItems);
    setSummary(calcSummary(nextItems));
    setSelectedItemId(id);
    await upsertItem(currentRestaurantId, selectedDate, payload, settings, items);
    setEditingItemId(null);
    setDraft(createEmptyDraft());
  }, [currentRestaurantId, draft, editingItemId, items, selectedDate, settings]);

  const handleAddRow = () => {
    if (!currentRestaurantId) return;
    setEditingItemId(null);
    setDraft(createEmptyDraft());
    setSelectedItemId(null);
  };

  const handleDuplicateRow = () => {
    if (!selectedItemId) return;
    const target = items.find((item) => item.id === selectedItemId);
    if (!target) return;
    const duplicateDraft = { ...toDraft(target), id: crypto.randomUUID() };
    setDraft(duplicateDraft);
    setEditingItemId(null);
    setSelectedItemId(null);
  };

  const handleEditRow = useCallback(
    (id: string) => {
      const target = items.find((item) => item.id === id);
      if (!target) return;
      setDraft(toDraft(target));
      setEditingItemId(id);
      setSelectedItemId(id);
    },
    [items]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
    setDraft(createEmptyDraft());
  }, []);

  const handleDeleteRow = async () => {
    if (!currentRestaurantId || !selectedItemId) return;
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== selectedItemId);
      setSummary(calcSummary(next));
      return next;
    });
    await deleteItem(currentRestaurantId, selectedDate, selectedItemId, items);
    if (editingItemId === selectedItemId) {
      setEditingItemId(null);
      setDraft(createEmptyDraft());
    }
    setSelectedItemId(null);
  };

  const handleClearDay = async () => {
    if (!currentRestaurantId) return;
    await clearDay(currentRestaurantId, selectedDate, items.map((item) => item.id));
    setItems([]);
    setSummary({ ...DEFAULT_SUMMARY });
    setSelectedItemId(null);
    setEditingItemId(null);
    setDraft(createEmptyDraft());
  };

  const handleImport = async (newItems: LineItem[]) => {
    if (!currentRestaurantId) return;
    const combined = [...items, ...newItems];
    setItems(combined);
    setSummary(calcSummary(combined));
    await importItems(currentRestaurantId, selectedDate, newItems, settings, items);
    setEditingItemId(null);
    setDraft(createEmptyDraft());
    setSelectedItemId(null);
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

  const metrics = useMemo(
    () => [
      {
        title: 'Food Cost (%)',
        value: formatPercent(summary.foodCostPct, 1),
        hint: 'Cost on POS ÷ Total Sales × 100',
        emphasize: true
      },
      {
        title: 'Variance (%)',
        value: formatPercent(summary.variancePct, 1)
      },
      {
        title: 'Total Sales (JD)',
        value: formatCurrency(summary.totalSalesJD)
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
          <h1 className="text-2xl font-semibold">{pageTitle}</h1>
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
          <div key={metric.title} className="h-full">
            <MetricCard {...metric} />
          </div>
        ))}
        <div className="sm:col-span-2 xl:col-span-1">
          <DayList days={recentDays} activeDate={selectedDate} onSelect={setSelectedDate} className="h-full" />
        </div>
      </section>

      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] xl:grid-cols-4">
          <div className="rounded-lg border bg-card/80 p-4 xl:col-span-3">
            <LineItemForm
              value={draft}
              isEditing={Boolean(editingItemId)}
              onChangeText={handleDraftTextChange}
              onChangeNumber={handleDraftNumberChange}
              onSubmit={() => {
                void handleSubmitDraft();
              }}
              onCancel={handleCancelEdit}
            />
          </div>
          <Toolbar
            settings={settings}
            onAdd={handleAddRow}
            onDuplicate={handleDuplicateRow}
            onDelete={handleDeleteRow}
            onImport={handleImport}
            onExport={handleExport}
            onClear={handleClearDay}
            disableDuplicate={!selectedItemId}
            disableDelete={!selectedItemId}
            className="h-full xl:col-span-1"
          />
        </div>
        <div className={cn('relative', loadingDay && 'pointer-events-none opacity-60')}>
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
            onEdit={handleEditRow}
          />
        </div>
      </div>
    </main>
  );
}
