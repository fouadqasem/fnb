'use client';

import { useState } from 'react';
import { ChevronsUpDown, Plus, Pencil, Archive } from 'lucide-react';
import { Restaurant } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RestaurantSwitcherProps {
  restaurants: Restaurant[];
  currentRestaurantId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}

export function RestaurantSwitcher({
  restaurants,
  currentRestaurantId,
  onSelect,
  onCreate,
  onRename,
  onArchive
}: RestaurantSwitcherProps) {
  const current = restaurants.find((r) => r.id === currentRestaurantId) ?? null;
  const [nameInput, setNameInput] = useState('');
  const [renameInput, setRenameInput] = useState(current?.name ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            <span className="truncate text-left">
              {current ? current.name : 'Select restaurant'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuLabel>Restaurants</DropdownMenuLabel>
          {restaurants.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground">No restaurants yet</div>
          ) : (
            restaurants.map((restaurant) => (
              <DropdownMenuItem
                key={restaurant.id}
                onSelect={() => onSelect(restaurant.id)}
                className="justify-between"
              >
                <span className="truncate">{restaurant.name}</span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create restaurant
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!current}
            onSelect={() => {
              if (!current) return;
              setRenameInput(current.name);
              setRenameOpen(true);
            }}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!current}
            onSelect={() => {
              if (!current) return;
              void onArchive(current.id);
            }}
            className="gap-2 text-destructive"
          >
            <Archive className="h-4 w-4" /> Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create restaurant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="restaurant-name">Name</Label>
            <Input
              id="restaurant-name"
              placeholder="e.g. Downtown Bistro"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
            />
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!nameInput.trim()) return;
                await onCreate(nameInput.trim());
                setNameInput('');
                setCreateOpen(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename restaurant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="restaurant-rename">Name</Label>
            <Input
              id="restaurant-rename"
              value={renameInput}
              onChange={(event) => setRenameInput(event.target.value)}
            />
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!current || !renameInput.trim()) return;
                await onRename(current.id, renameInput.trim());
                setRenameOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
