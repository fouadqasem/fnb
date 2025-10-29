'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type LineItemDraft = {
  id: string;
  category: string;
  menuItem: string;
  qtyNos: string;
  unitCostJD: string;
  unitPriceJD: string;
  costOnPosJD: string;
  totalSalesJD: string;
};

interface LineItemFormProps {
  value: LineItemDraft;
  isEditing: boolean;
  onChangeText: (field: 'category' | 'menuItem', value: string) => void;
  onChangeNumber: (
    field: Exclude<keyof LineItemDraft, 'category' | 'menuItem' | 'id'>,
    value: string
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function LineItemForm({
  value,
  isEditing,
  onChangeText,
  onChangeNumber,
  onSubmit,
  onCancel
}: LineItemFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1 md:col-span-1 xl:col-span-1">
          <Label htmlFor="item-category">Category</Label>
          <Input
            id="item-category"
            value={value.category}
            onChange={(event) => onChangeText('category', event.target.value)}
            placeholder="e.g. Salads"
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-1 xl:col-span-3">
          <Label htmlFor="menu-item">Menu Items</Label>
          <Input
            id="menu-item"
            value={value.menuItem}
            onChange={(event) => onChangeText('menuItem', event.target.value)}
            placeholder="e.g. Greek Salad"
            className="h-12 text-base"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-qty">Qty</Label>
          <Input
            id="item-qty"
            type="number"
            inputMode="decimal"
            step="0.001"
            value={value.qtyNos}
            onChange={(event) => onChangeNumber('qtyNos', event.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-unit-cost">Unit Cost (JD)</Label>
          <Input
            id="item-unit-cost"
            type="number"
            inputMode="decimal"
            step="0.001"
            value={value.unitCostJD}
            onChange={(event) => onChangeNumber('unitCostJD', event.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-selling-price">Selling Price (JD)</Label>
          <Input
            id="item-selling-price"
            type="number"
            inputMode="decimal"
            step="0.001"
            value={value.unitPriceJD}
            onChange={(event) => onChangeNumber('unitPriceJD', event.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-cost-pos">Cost on POS (JD)</Label>
          <Input
            id="item-cost-pos"
            type="number"
            inputMode="decimal"
            step="0.001"
            value={value.costOnPosJD}
            onChange={(event) => onChangeNumber('costOnPosJD', event.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="item-total-sales">Total Sales (JD)</Label>
          <Input
            id="item-total-sales"
            type="number"
            inputMode="decimal"
            step="0.001"
            value={value.totalSalesJD}
            onChange={(event) => onChangeNumber('totalSalesJD', event.target.value)}
            className="h-12 text-base"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} className="h-12 sm:w-auto">
            Cancel
        </Button>
        <Button type="submit" className="h-12 sm:w-auto">
          {isEditing ? 'Update item' : 'Add item'}
        </Button>
      </div>
    </form>
  );
}
