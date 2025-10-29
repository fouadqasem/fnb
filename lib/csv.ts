import Papa from 'papaparse';
import type { DaySettings, LineItem, LineItemInput } from '@/types';
import { calcDerivedForItem, toNumberSafe } from './calculations';

export const CSV_HEADERS = [
  'Category',
  'Menu Item',
  'Qty Nos.',
  'Unit Cost (JD)',
  'Unit Price (JD)',
  'Cost on POS (JD)',
  'Total Sales (JD)'
];

export function sanitizeRow(values: string[]): LineItemInput {
  return {
    id: crypto.randomUUID(),
    category: values[0]?.trim() ?? '',
    menuItem: values[1]?.trim() ?? '',
    qtyNos: toNumberSafe(values[2]),
    unitCostJD: toNumberSafe(values[3]),
    unitPriceJD: toNumberSafe(values[4]),
    costOnPosJD: toNumberSafe(values[5]),
    totalSalesJD: toNumberSafe(values[6])
  };
}

export function parseCsv(text: string, settings: DaySettings): LineItem[] {
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: 'greedy'
  });

  const [maybeHeader, ...rows] = result.data;
  const hasHeader = maybeHeader?.length === CSV_HEADERS.length &&
    maybeHeader.every((cell, index) => cell?.trim().toLowerCase() === CSV_HEADERS[index].toLowerCase());

  const lineRows = hasHeader ? rows : result.data;

  return lineRows
    .map((row) => sanitizeRow(row))
    .map((row) => calcDerivedForItem(row, settings));
}

export function exportCsv(items: LineItem[]): string {
  const data = items.map((item) => ({
    Category: item.category,
    'Menu Item': item.menuItem,
    'Qty Nos.': item.qtyNos,
    'Unit Cost (JD)': item.unitCostJD,
    'Unit Price (JD)': item.unitPriceJD,
    'Cost on POS (JD)': item.costOnPosJD,
    'Total Sales (JD)': item.totalSalesJD,
    'Total Cost (JD)': item.totalCostJD,
    'Cost Variance (JD)': item.costVarianceJD,
    'Day Food Cost (%)': item.dayFoodCostPct,
    'Recipe Food Cost (%)': item.recipeFoodCostPct,
    'Variance (%)': item.variancePct,
    'Total Variance (JD)': item.totalVarianceJD
  }));

  return Papa.unparse(data);
}
