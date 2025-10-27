import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  getFirebaseServices: () => ({ db: {} })
}));

const batchSet = vi.fn();
const batchCommit = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn((ref: any, path: string) => ({ path: `${ref.path ?? ref}/${path}` })),
    doc: vi.fn((ref: any, path: string) => ({ path: `${ref.path ?? ref}/${path}` })),
    writeBatch: vi.fn(() => ({ set: batchSet, commit: batchCommit })),
    serverTimestamp: vi.fn(() => 'ts'),
    orderBy: vi.fn((field: string, direction?: string) => ({ field, direction })),
    query: vi.fn((...args: any[]) => ({ args })),
    onSnapshot: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn()
  };
});

import { recomputeAndSaveSummary } from '@/lib/firestore';
import { calcDerivedForItem } from '@/lib/calculations';
import type { DaySettings } from '@/types';

const settings: DaySettings = { useImpliedSalesWhenBlank: false };

beforeEach(() => {
  batchSet.mockClear();
  batchCommit.mockClear();
});

describe('firestore helpers', () => {
  it('recomputeAndSaveSummary writes aggregated summary', async () => {
    const items = [
      calcDerivedForItem(
        {
          id: '1',
          category: '',
          menuItem: '',
          qtyNos: 2,
          unitCostJD: 3,
          unitPriceJD: 6,
          totalSalesJD: 12
        },
        settings
      ),
      calcDerivedForItem(
        {
          id: '2',
          category: '',
          menuItem: '',
          qtyNos: 1,
          unitCostJD: 5,
          unitPriceJD: 10,
          totalSalesJD: 10
        },
        settings
      )
    ];

    await recomputeAndSaveSummary('rest-1', '2024-01-01', items);

    expect(batchSet).toHaveBeenCalled();
    const [ref, payload] = batchSet.mock.calls.at(-1) ?? [];
    expect(ref).toBeTruthy();
    expect(payload.summary.totalSalesJD).toBeCloseTo(22);
    expect(payload.summary.totalCostJD).toBeCloseTo(11);
    expect(batchCommit).toHaveBeenCalled();
  });
});
