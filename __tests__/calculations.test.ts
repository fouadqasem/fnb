import { describe, expect, it } from 'vitest';
import {
  calcDerivedForItem,
  calcImpliedSales,
  calcLineCost,
  calcLineVariance,
  calcSummary,
  toNumberSafe
} from '@/lib/calculations';
import type { DaySettings, LineItemInput } from '@/types';

const settings: DaySettings = { useImpliedSalesWhenBlank: false };

describe('calculations', () => {
  it('toNumberSafe converts invalid values to zero', () => {
    expect(toNumberSafe('5.25')).toBeCloseTo(5.25);
    expect(toNumberSafe('abc')).toBe(0);
    expect(toNumberSafe(undefined)).toBe(0);
  });

  it('calcLineCost multiplies quantity and unit cost', () => {
    expect(calcLineCost(3, 2.5)).toBeCloseTo(7.5);
  });

  it('calcImpliedSales multiplies quantity and unit price', () => {
    expect(calcImpliedSales(4, 1.25)).toBeCloseTo(5);
  });

  it('calcLineVariance calculates value and percentage', () => {
    const variance = calcLineVariance(100, 60);
    expect(variance.value).toBeCloseTo(40);
    expect(variance.pct).toBeCloseTo(40);
  });

  it('calcDerivedForItem computes all derived fields', () => {
    const input: LineItemInput = {
      id: '1',
      category: 'Salads',
      menuItem: 'Greek Salad',
      qtyNos: 10,
      unitCostJD: 1.5,
      unitPriceJD: 3,
      totalSalesJD: 30
    };

    const result = calcDerivedForItem(input, settings);
    expect(result.lineCostJD).toBeCloseTo(15);
    expect(result.impliedSalesJD).toBeCloseTo(30);
    expect(result.varianceValueJD).toBeCloseTo(15);
    expect(result.variancePct).toBeCloseTo(50);
  });

  it('calcDerivedForItem uses implied sales when configured', () => {
    const input: LineItemInput = {
      id: '2',
      category: 'Mains',
      menuItem: 'Burger',
      qtyNos: 5,
      unitCostJD: 2,
      unitPriceJD: 4,
      totalSalesJD: 0
    };

    const result = calcDerivedForItem(input, { useImpliedSalesWhenBlank: true });
    expect(result.totalSalesJD).toBeCloseTo(20);
    expect(result.varianceValueJD).toBeCloseTo(10);
  });

  it('calcSummary aggregates daily totals', () => {
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

    const summary = calcSummary(items);
    expect(summary.totalCostJD).toBeCloseTo(11);
    expect(summary.totalSalesJD).toBeCloseTo(22);
    expect(summary.parCstJD).toBeCloseTo(11);
    expect(summary.foodCostPct).toBeCloseTo(50);
  });
});
