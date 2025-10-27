import type { DailySummary, DaySettings, LineItem, LineItemInput } from '@/types';

export function toNumberSafe(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(num) ? num : 0;
}

export function calcLineCost(qtyNos: number, unitCostJD: number) {
  return toNumberSafe(qtyNos) * toNumberSafe(unitCostJD);
}

export function calcImpliedSales(qtyNos: number, unitPriceJD: number) {
  return toNumberSafe(qtyNos) * toNumberSafe(unitPriceJD);
}

export function calcLineVariance(totalSalesJD: number, lineCostJD: number) {
  const safeSales = toNumberSafe(totalSalesJD);
  const safeCost = toNumberSafe(lineCostJD);
  const value = safeSales - safeCost;
  const pct = safeSales > 0 ? (value / safeSales) * 100 : 0;
  return { value, pct };
}

export function calcDerivedForItem(item: LineItemInput, settings: DaySettings): LineItem {
  const qtyNos = toNumberSafe(item.qtyNos);
  const unitCostJD = toNumberSafe(item.unitCostJD);
  const unitPriceJD = toNumberSafe(item.unitPriceJD);
  const impliedSalesJD = calcImpliedSales(qtyNos, unitPriceJD);
  const totalSalesInput = toNumberSafe(item.totalSalesJD);
  const totalSalesJD =
    settings.useImpliedSalesWhenBlank && totalSalesInput === 0 ? impliedSalesJD : totalSalesInput;
  const lineCostJD = calcLineCost(qtyNos, unitCostJD);
  const variance = calcLineVariance(totalSalesJD, lineCostJD);

  return {
    ...item,
    qtyNos,
    unitCostJD,
    unitPriceJD,
    totalSalesJD,
    lineCostJD,
    impliedSalesJD,
    varianceValueJD: variance.value,
    variancePct: variance.pct
  };
}

export function calcSummary(items: LineItem[]): DailySummary {
  const totals = items.reduce(
    (acc, item) => {
      acc.totalCostJD += toNumberSafe(item.lineCostJD);
      acc.totalSalesJD += toNumberSafe(item.totalSalesJD);
      return acc;
    },
    { totalCostJD: 0, totalSalesJD: 0 }
  );

  const parCstJD = totals.totalSalesJD - totals.totalCostJD;
  const foodCostPct = totals.totalSalesJD > 0 ? (totals.totalCostJD / totals.totalSalesJD) * 100 : 0;

  return {
    totalCostJD: totals.totalCostJD,
    totalSalesJD: totals.totalSalesJD,
    parCstJD,
    foodCostPct,
    updatedAt: undefined
  };
}
