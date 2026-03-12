import type { FormEvent } from 'react';
import type { Character } from '@shared/character';
import type { Item } from '@shared/item';
import type { Location } from '@shared/location';
import type { ItemFormState } from '@renderer/lib/forms';
import { ItemEditor } from './ItemEditor';
import { ItemList } from './ItemList';

type ItemWorkspaceProps = {
  characters: Character[];
  createItemForm: ItemFormState;
  editItemForm: ItemFormState;
  filteredItems: Item[];
  isCreatingItem: boolean;
  isDeletingItem: boolean;
  isLoadingItemDetails: boolean;
  isLoadingItems: boolean;
  isUpdatingItem: boolean;
  itemAssignmentFilter: string;
  itemSearch: string;
  items: Item[];
  locations: Location[];
  onCreateItem: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCreateItemFormChange: (changes: Partial<ItemFormState>) => void;
  onDeleteItem: () => void | Promise<void>;
  onEditItemFormChange: (changes: Partial<ItemFormState>) => void;
  onItemAssignmentFilterChange: (value: string) => void;
  onItemSearchChange: (value: string) => void;
  onSelectItem: (id: number) => void;
  onUpdateItem: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  selectedItem: Item | null;
  selectedItemId: number | null;
};

export function ItemWorkspace({
  characters,
  createItemForm,
  editItemForm,
  filteredItems,
  isCreatingItem,
  isDeletingItem,
  isLoadingItemDetails,
  isLoadingItems,
  isUpdatingItem,
  itemAssignmentFilter,
  itemSearch,
  items,
  locations,
  onCreateItem,
  onCreateItemFormChange,
  onDeleteItem,
  onEditItemFormChange,
  onItemAssignmentFilterChange,
  onItemSearchChange,
  onSelectItem,
  onUpdateItem,
  selectedItem,
  selectedItemId,
}: ItemWorkspaceProps) {
  return (
    <main className="content-grid">
      <ItemList
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
        form={editItemForm}
        isDeleting={isDeletingItem}
        isLoading={isLoadingItemDetails}
        isSubmitting={isUpdatingItem}
        item={selectedItem}
        locations={locations}
        mode="edit"
        onDelete={onDeleteItem}
        onFormChange={onEditItemFormChange}
        onSubmit={onUpdateItem}
        selectedItemId={selectedItemId}
      />

      <ItemEditor
        characters={characters}
        form={createItemForm}
        isSubmitting={isCreatingItem}
        item={null}
        locations={locations}
        mode="create"
        onFormChange={onCreateItemFormChange}
        onSubmit={onCreateItem}
        selectedItemId={selectedItemId}
      />
    </main>
  );
}
