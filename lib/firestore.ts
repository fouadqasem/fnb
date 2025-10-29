'use client';

import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import type { DailySummary, DaySettings, LineItem, LineItemInput, Restaurant } from '@/types';
import { calcDerivedForItem, calcSummary, toNumberSafe } from './calculations';

export const DEFAULT_SETTINGS: DaySettings = {
  useImpliedSalesWhenBlank: false
};

export const DEFAULT_SUMMARY: DailySummary = {
  totalCostJD: 0,
  totalSalesJD: 0,
  parCstJD: 0,
  foodCostPct: 0
};

export function restaurantDocRef(restaurantId: string) {
  const { db } = getFirebaseServices();
  return doc(collection(db, 'restaurants'), restaurantId);
}

export function dayDocRef(restaurantId: string, date: string) {
  return doc(collection(restaurantDocRef(restaurantId), 'days'), date);
}

export function lineItemsColRef(restaurantId: string, date: string) {
  return collection(dayDocRef(restaurantId, date), 'lineItems');
}

export function listActiveRestaurants$(
  callback: (restaurants: Restaurant[]) => void
) {
  const { db } = getFirebaseServices();
  const restaurantsQuery = query(
    collection(db, 'restaurants'),
    where('isActive', '==', true)
  );
  return onSnapshot(restaurantsQuery, (snapshot) => {
    const restaurants = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Restaurant, 'id'>) }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    callback(restaurants);
  });
}

type DaySubscriptionCallback = (data: {
  items: LineItem[];
  summary: DailySummary;
  settings: DaySettings;
}) => void;

export function getDay$(
  restaurantId: string,
  date: string,
  callback: DaySubscriptionCallback
) {
  const itemsRef = query(lineItemsColRef(restaurantId, date), orderBy('menuItem'));
  const dayRef = dayDocRef(restaurantId, date);

  let items: LineItem[] = [];
  let summary: DailySummary = { ...DEFAULT_SUMMARY };
  let settings: DaySettings = { ...DEFAULT_SETTINGS };

  const emit = () => callback({ items, summary, settings });

  const unsubItems = onSnapshot(itemsRef, (snapshot) => {
    items = snapshot.docs.map((doc) => {

      const data = doc.data() as LineItem;
      return { ...data, id: doc.id };

    });
    emit();
  });

  const unsubDay = onSnapshot(dayRef, (snapshot) => {
    const data = snapshot.data();
    summary = {
      ...DEFAULT_SUMMARY,
      ...(data?.summary ?? {})
    };
    settings = {
      ...DEFAULT_SETTINGS,
      ...(data?.settings ?? {})
    };
    emit();
  });

  return () => {
    unsubItems();
    unsubDay();
  };
}

export function listRecentDays$(
  restaurantId: string,
  callback: (days: { date: string; summary: DailySummary }[]) => void
) {
  const daysRef = query(
    collection(restaurantDocRef(restaurantId), 'days'),
    orderBy('summary.updatedAt', 'desc'),
    limit(30)
  );

  return onSnapshot(daysRef, (snapshot) => {
    const days = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        date: docSnap.id,
        summary: {
          ...DEFAULT_SUMMARY,
          ...(data?.summary ?? {})
        }
      };
    });
    callback(days);
  });
}

export async function createRestaurant(name: string) {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  const ref = doc(collection(db, 'restaurants'));
  const now = serverTimestamp();
  batch.set(ref, {
    name,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });
  await batch.commit();
  return ref.id;
}

export async function renameRestaurant(restaurantId: string, name: string) {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  const ref = doc(collection(db, 'restaurants'), restaurantId);
  batch.update(ref, { name, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function archiveRestaurant(restaurantId: string) {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  const ref = doc(collection(db, 'restaurants'), restaurantId);
  batch.update(ref, { isActive: false, updatedAt: serverTimestamp() });
  await batch.commit();
}

function ensureLineInput(partial: Partial<LineItemInput> & { id?: string }): LineItemInput {
  return {
    id: partial.id ?? crypto.randomUUID(),
    category: partial.category ?? '',
    menuItem: partial.menuItem ?? '',
    qtyNos: toNumberSafe(partial.qtyNos),
    unitCostJD: toNumberSafe(partial.unitCostJD),
    unitPriceJD: toNumberSafe(partial.unitPriceJD),
    totalSalesJD: toNumberSafe(partial.totalSalesJD)
  };
}

export async function upsertItem(
  restaurantId: string,
  date: string,
  input: Partial<LineItemInput> & { id?: string },
  settings: DaySettings,
  existingItems: LineItem[]
) {
  const { db } = getFirebaseServices();
  const normalized = ensureLineInput(input);
  const derived = calcDerivedForItem(normalized, settings);
  const lineRef = doc(lineItemsColRef(restaurantId, date), derived.id);

  const updatedItems = existingItems.filter((item) => item.id !== derived.id).concat(derived);
  const summary = calcSummary(updatedItems);

  const batch = writeBatch(db);
  const existing = existingItems.find((item) => item.id === derived.id);
  batch.set(lineRef, {
    ...derived,
    createdAt: existing?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  batch.set(
    dayDocRef(restaurantId, date),
    {
      summary: { ...summary, updatedAt: serverTimestamp() },
      settings
    },
    { merge: true }
  );

  await batch.commit();

  return derived.id;
}

export async function deleteItem(
  restaurantId: string,
  date: string,
  id: string,
  remainingItems: LineItem[]
) {
  const { db } = getFirebaseServices();
  const lineRef = doc(lineItemsColRef(restaurantId, date), id);
  const summary = calcSummary(remainingItems.filter((item) => item.id !== id));
  const batch = writeBatch(db);
  batch.delete(lineRef);
  batch.set(
    dayDocRef(restaurantId, date),
    {
      summary: { ...summary, updatedAt: serverTimestamp() }
    },
    { merge: true }
  );
  await batch.commit();
}

export async function clearDay(
  restaurantId: string,
  date: string,
  itemIds: string[]
) {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  itemIds.forEach((id) => {
    const ref = doc(lineItemsColRef(restaurantId, date), id);
    batch.delete(ref);
  });
  batch.set(
    dayDocRef(restaurantId, date),
    {
      summary: { ...DEFAULT_SUMMARY, updatedAt: serverTimestamp() },
      settings: DEFAULT_SETTINGS
    },
    { merge: true }
  );
  await batch.commit();
}

export async function recomputeAndSaveSummary(
  restaurantId: string,
  date: string,
  items?: LineItem[]
) {
  const { db } = getFirebaseServices();
  let workingItems = items;
  if (!workingItems) {
    const snapshot = await getDocs(lineItemsColRef(restaurantId, date));
    workingItems = snapshot.docs.map((doc) => {

      const data = doc.data() as LineItem;
      return { ...data, id: doc.id };

    });
  }
  const summary = calcSummary(workingItems ?? []);
  const batch = writeBatch(db);
  batch.set(
    dayDocRef(restaurantId, date),
    {
      summary: { ...summary, updatedAt: serverTimestamp() }
    },
    { merge: true }
  );
  await batch.commit();
  return summary;
}

export async function importItems(
  restaurantId: string,
  date: string,
  items: LineItem[],
  settings: DaySettings,
  existingItems: LineItem[]
) {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  const now = serverTimestamp();

  items.forEach((item) => {
    const ref = doc(lineItemsColRef(restaurantId, date), item.id);
    batch.set(ref, {
      ...item,
      createdAt: item.createdAt ?? now,
      updatedAt: now
    });
  });

  const combined = existingItems.filter((existing) => !items.some((item) => item.id === existing.id)).concat(items);
  const summary = calcSummary(combined);

  batch.set(
    dayDocRef(restaurantId, date),
    {
      summary: { ...summary, updatedAt: now },
      settings
    },
    { merge: true }
  );

  await batch.commit();
}
