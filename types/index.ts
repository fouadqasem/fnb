import type { Timestamp } from 'firebase/firestore';

export type Restaurant = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type DaySettings = {
  useImpliedSalesWhenBlank: boolean;
};

export type DailySummary = {
  totalCostJD: number;
  totalSalesJD: number;
  parCstJD: number;
  foodCostPct: number;
  updatedAt?: Timestamp;
};

export type LineItemInput = {
  id: string;
  category: string;
  menuItem: string;
  qtyNos: number;
  unitCostJD: number;
  unitPriceJD: number;
  totalSalesJD: number;
};

export type LineItemDerived = {
  lineCostJD: number;
  impliedSalesJD: number;
  varianceValueJD: number;
  variancePct: number;
};

export type LineItem = LineItemInput &
  LineItemDerived & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  };

export type DayDoc = {
  summary: DailySummary;
  settings: DaySettings;
};

export type RestaurantAccessRole = 'owner' | 'manager' | 'viewer';

export type AccessGrant = {
  role: RestaurantAccessRole;
  active: boolean;
  grantedAt: Timestamp;
  revokedAt?: Timestamp;
};
