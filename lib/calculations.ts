import type { DailySummary, DaySettings, LineItem, LineItemInput } from '@/types';

export function toNumberSafe(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(num) ? num : 0;
}

export function calcTotalCost(qtyNos: number, unitCostJD: number) {
  return toNumberSafe(qtyNos) * toNumberSafe(unitCostJD);
}

export function calcCostVariance(totalCostJD: number, costOnPosJD: number) {
  return toNumberSafe(totalCostJD) - toNumberSafe(costOnPosJD);
}

export function calcDayFoodCost(costOnPosJD: number, totalSalesJD: number) {
  const safeSales = toNumberSafe(totalSalesJD);
  const safeCostOnPos = toNumberSafe(costOnPosJD);
  return safeSales > 0 ? (safeCostOnPos / safeSales) * 100 : 0;
}

export function calcRecipeFoodCost(unitCostJD: number, unitPriceJD: number) {
  const safePrice = toNumberSafe(unitPriceJD);
  const safeCost = toNumberSafe(unitCostJD);
  return safePrice > 0 ? (safeCost / safePrice) * 100 : 0;
}

export function calcVariancePercent(recipeFoodCostPct: number, dayFoodCostPct: number) {
  return toNumberSafe(recipeFoodCostPct) - toNumberSafe(dayFoodCostPct);
}

export function calcTotalVariance(totalCostJD: number, variancePct: number) {
  return toNumberSafe(totalCostJD) * (toNumberSafe(variancePct) / 100);
}

export function calcDerivedForItem(item: LineItemInput, settings: DaySettings): LineItem {
  const qtyNos = toNumberSafe(item.qtyNos);
  const unitCostJD = toNumberSafe(item.unitCostJD);
  const unitPriceJD = toNumberSafe(item.unitPriceJD);
  const costOnPosJD = toNumberSafe(item.costOnPosJD);
  const impliedSalesJD = qtyNos * unitPriceJD;
  const totalSalesInput = toNumberSafe(item.totalSalesJD);
  const totalSalesJD =
    settings.useImpliedSalesWhenBlank && totalSalesInput === 0 ? impliedSalesJD : totalSalesInput;
  const totalCostJD = calcTotalCost(qtyNos, unitCostJD);
  const costVarianceJD = calcCostVariance(totalCostJD, costOnPosJD);
  const dayFoodCostPct = calcDayFoodCost(costOnPosJD, totalSalesJD);
  const recipeFoodCostPct = calcRecipeFoodCost(unitCostJD, unitPriceJD);
  const variancePct = calcVariancePercent(recipeFoodCostPct, dayFoodCostPct);
  const totalVarianceJD = calcTotalVariance(totalCostJD, variancePct);

  return {
    ...item,
    qtyNos,
    unitCostJD,
    unitPriceJD,
    costOnPosJD,
    totalSalesJD,
    totalCostJD,
    costVarianceJD,
    dayFoodCostPct,
    recipeFoodCostPct,
    variancePct,
    totalVarianceJD
  };
}

export function calcSummary(items: LineItem[]): DailySummary {
  const totals = items.reduce(
    (acc, item) => {
      acc.totalCostJD += toNumberSafe(item.totalCostJD);
      acc.totalSalesJD += toNumberSafe(item.totalSalesJD);
      acc.totalCostOnPosJD += toNumberSafe(item.costOnPosJD);
      acc.totalVarianceJD += toNumberSafe(item.totalVarianceJD);
      acc.totalRecipeSalesJD += toNumberSafe(item.unitPriceJD) * toNumberSafe(item.qtyNos);
      return acc;
    },
    {
      totalCostJD: 0,
      totalSalesJD: 0,
      totalCostOnPosJD: 0,
      totalVarianceJD: 0,
      totalRecipeSalesJD: 0
    }
  );

  const dayFoodCostPct = calcDayFoodCost(totals.totalCostOnPosJD, totals.totalSalesJD);
  const recipeFoodCostPct =
    totals.totalRecipeSalesJD > 0 ? (totals.totalCostJD / totals.totalRecipeSalesJD) * 100 : 0;
  const variancePct = calcVariancePercent(recipeFoodCostPct, dayFoodCostPct);
  const parCstJD = calcCostVariance(totals.totalCostJD, totals.totalCostOnPosJD);

  return {
    totalCostJD: totals.totalCostJD,
    totalSalesJD: totals.totalSalesJD,
    parCstJD,
    foodCostPct: dayFoodCostPct,
    totalCostOnPosJD: totals.totalCostOnPosJD,
    totalVarianceJD: totals.totalVarianceJD,
    recipeFoodCostPct,
    variancePct,
    updatedAt: undefined
  };
}
