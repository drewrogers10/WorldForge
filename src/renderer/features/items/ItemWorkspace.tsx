import type { FormEvent } from 'react';
import type { Character } from '@shared/character';
import type { Item } from '@shared/item';
import type { Location } from '@shared/location';
import type { TemporalDetailStatus } from '@shared/temporal';
import type { ItemFormState } from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';
import { ItemEditor } from './ItemEditor';
import { ItemList } from './ItemList';

type ItemWorkspaceProps = {
  activeForm: ItemFormState;
  changedItemIds: ReadonlySet<number>;
  characters: Character[];
  filteredItems: Item[];
  isLoadingItemDetails: boolean;
  isLoadingItems: boolean;
  isSavingItem: boolean;
  itemAssignmentFilter: string;
  itemSearch: string;
  items: Item[];
  locations: Location[];
  mode: WorkspaceMode;
  onFormChange: (changes: Partial<ItemFormState>) => void;
  onItemAssignmentFilterChange: (value: string) => void;
  onItemSearchChange: (value: string) => void;
  onSelectItem: (id: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  selectedItem: Item | null;
  selectedItemId: number | null;
  selectedItemStatus: TemporalDetailStatus;
  tick: number;
};

export function ItemWorkspace({
  activeForm,
  changedItemIds,
  characters,
  filteredItems,
  isLoadingItemDetails,
  isLoadingItems,
  isSavingItem,
  itemAssignmentFilter,
  itemSearch,
  items,
  locations,
  mode,
  onFormChange,
  onItemAssignmentFilterChange,
  onItemSearchChange,
  onSelectItem,
  onSubmit,
  selectedItem,
  selectedItemId,
  selectedItemStatus,
  tick,
}: ItemWorkspaceProps) {
  return (
    <main className="content-grid">
      <ItemList
        changedItemIds={changedItemIds}
        filteredItems={filteredItems}
        isLoading={isLoadingItems}
        itemAssignmentFilter={itemAssignmentFilter}
        itemSearch={itemSearch}
        items={items}
        onItemAssignmentFilterChange={onItemAssignmentFilterChange}
        onItemSearchChange={onItemSearchChange}
        onSelectItem={onSelectItem}
        selectedItemId={selectedItemId}
      />

      <ItemEditor
        characters={characters}
        form={activeForm}
        isLoading={isLoadingItemDetails}
        isSubmitting={isSavingItem}
        item={selectedItem}
        locations={locations}
        mode={mode}
        onFormChange={onFormChange}
        onSubmit={onSubmit}
        selectedItemId={selectedItemId}
        selectedItemStatus={selectedItemStatus}
        tick={tick}
      />
    </main>
  );
}
