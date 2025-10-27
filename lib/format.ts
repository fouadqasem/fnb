const currencyFormatter = new Intl.NumberFormat('en-JO', {
  style: 'currency',
  currency: 'JOD',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value || 0);
}

export function formatNumber(value: number, fractionDigits = 3) {
  return value.toLocaleString('en-JO', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

export function formatPercent(value: number, fractionDigits = 1) {
  return `${value.toFixed(fractionDigits)}%`;
}
