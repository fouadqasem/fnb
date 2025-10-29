import { describe, expect, it } from 'vitest';
import {
  calcCostVariance,
  calcDayFoodCost,
  calcDerivedForItem,
  calcRecipeFoodCost,
  calcSummary,
  calcTotalCost,
  calcTotalVariance,
  calcVariancePercent,
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

  it('calcTotalCost multiplies quantity and unit cost', () => {
    expect(calcTotalCost(3, 2.5)).toBeCloseTo(7.5);
  });

  it('calcCostVariance subtracts POS cost from total cost', () => {
    expect(calcCostVariance(10, 7.5)).toBeCloseTo(2.5);
  });

  it('percentage helpers compute expected values', () => {
    expect(calcDayFoodCost(40, 100)).toBeCloseTo(40);
    expect(calcRecipeFoodCost(2, 8)).toBeCloseTo(25);
    expect(calcVariancePercent(30, 20)).toBeCloseTo(10);
    expect(calcTotalVariance(50, 10)).toBeCloseTo(5);
  });

  it('calcDerivedForItem computes all derived fields', () => {
    const input: LineItemInput = {
      id: '1',
      category: 'Salads',
      menuItem: 'Greek Salad',
      qtyNos: 10,
      unitCostJD: 1.5,
      unitPriceJD: 3,
      costOnPosJD: 12,
      totalSalesJD: 30
    };

    const result = calcDerivedForItem(input, settings);
    expect(result.totalCostJD).toBeCloseTo(15);
    expect(result.costVarianceJD).toBeCloseTo(3);
    expect(result.dayFoodCostPct).toBeCloseTo(40);
    expect(result.recipeFoodCostPct).toBeCloseTo(50);
    expect(result.variancePct).toBeCloseTo(10);
    expect(result.totalVarianceJD).toBeCloseTo(1.5);
  });

  it('calcDerivedForItem uses implied sales when configured', () => {
    const input: LineItemInput = {
      id: '2',
      category: 'Mains',
      menuItem: 'Burger',
      qtyNos: 5,
      unitCostJD: 2,
      unitPriceJD: 4,
      costOnPosJD: 0,
      totalSalesJD: 0
    };

    const result = calcDerivedForItem(input, { useImpliedSalesWhenBlank: true });
    expect(result.totalSalesJD).toBeCloseTo(20);
    expect(result.totalCostJD).toBeCloseTo(10);
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
          costOnPosJD: 5,
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
          costOnPosJD: 4,
          totalSalesJD: 10
        },
        settings
      )
    ];

    const summary = calcSummary(items);
    expect(summary.totalCostJD).toBeCloseTo(11);
    expect(summary.totalSalesJD).toBeCloseTo(22);
    expect(summary.totalCostOnPosJD).toBeCloseTo(9);
    expect(summary.totalVarianceJD).toBeCloseTo(1);
    expect(summary.parCstJD).toBeCloseTo(2);
    expect(summary.foodCostPct).toBeCloseTo(40.9091);
    expect(summary.recipeFoodCostPct).toBeCloseTo(50);
    expect(summary.variancePct).toBeCloseTo(9.0909);
  });
});
