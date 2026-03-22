import { useEffect, useState, type FormEvent } from 'react';
import { ItemWorkspace } from './ItemWorkspace';
import { emptyItemForm, getErrorMessage, type ItemFormState } from '@renderer/lib/forms';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useWorldStore } from '@renderer/store/worldStore';
import { useEntityStore } from '@renderer/store/entityStore';
import { useSidebarStore } from '@renderer/store/sidebarStore';
import { useUiStore } from '@renderer/store/uiStore';
import type { TemporalDetailStatus } from '@shared/temporal';
import type { Item } from '@shared/item';

export function ItemPage() {
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { characters, locations, items, isLoading, loadWorldData } = useWorldStore();
  const { selectedItemId, setSelectedItemId } = useEntityStore();
  const loadSidebarData = useSidebarStore((state) => state.loadSidebarData);
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedItemStatus, setSelectedItemStatus] = useState<TemporalDetailStatus>('missing');
  const [itemSearch, setItemSearch] = useState('');
  const [itemAssignmentFilter, setItemAssignmentFilter] = useState('all');

  const [createItemForm, setCreateItemForm] = useState<ItemFormState>(emptyItemForm(committedTick));
  const [editItemForm, setEditItemForm] = useState<ItemFormState>(emptyItemForm(committedTick));

  const [isLoadingItemDetails, setIsLoadingItemDetails] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  useEffect(() => {
    setCreateItemForm((current) => ({ ...current, effectiveTick: committedTick }));
    setEditItemForm((current) => ({ ...current, effectiveTick: committedTick }));
  }, [committedTick]);

  useEffect(() => {
    const timeout = setTimeout(() => { void loadWorldData(tick); }, 50);
    return () => clearTimeout(timeout);
  }, [tick, loadWorldData]);

  useEffect(() => {
    async function loadDetails() {
      if (selectedItemId === null) {
        setSelectedItem(null);
        setSelectedItemStatus('missing');
        return;
      }
      setIsLoadingItemDetails(true);
      setErrorMessage(null);
      try {
        const detail = await window.worldForge.getItem({ id: selectedItemId, asOfTick: tick });
        if (detail) {
          setSelectedItemStatus(detail.status);
          setSelectedItem(detail.record);
          setEditItemForm(detail.record ? {
            name: detail.record.name,
            summary: detail.record.summary,
            quantity: detail.record.quantity,
            ownerCharacterId: detail.record.ownerCharacterId,
            locationId: detail.record.locationId,
            effectiveTick: committedTick
          } : emptyItemForm(committedTick));
        }
      } catch (e) { setErrorMessage(getErrorMessage(e)); } 
      finally { setIsLoadingItemDetails(false); }
    }
    const timeout = setTimeout(() => { void loadDetails(); }, 50);
    return () => clearTimeout(timeout);
  }, [tick, selectedItemId, committedTick, setErrorMessage]);

  async function handleCreateItem(e: FormEvent) {
    e.preventDefault();
    setIsCreatingItem(true);
    setErrorMessage(null);
    try {
      const created = await window.worldForge.createItem(createItemForm);
      setSelectedItemId(created.id);
      setCreateItemForm(emptyItemForm(committedTick));
      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
      ]);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsCreatingItem(false); }
  }

  async function handleUpdateItem(e: FormEvent) {
    e.preventDefault();
    if (selectedItemId === null) return;
    setIsUpdatingItem(true);
    setErrorMessage(null);
    try {
      await window.worldForge.updateItem({ id: selectedItemId, ...editItemForm });
      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
      ]);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsUpdatingItem(false); }
  }

  async function handleDeleteItem() {
    if (selectedItemId === null || isDeletingItem) return;
    if (!window.confirm('End this item at the selected effective time?')) return;
    setIsDeletingItem(true);
    setErrorMessage(null);
    try {
      await window.worldForge.deleteItem({ id: selectedItemId, effectiveTick: committedTick });
      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
      ]);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsDeletingItem(false); }
  }

  const filteredItems = items.filter((item) => {
    const assignmentSummary = item.ownerCharacter?.name ?? item.location?.name ?? 'Unassigned';
    const matchesSearch =
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.summary.toLowerCase().includes(itemSearch.toLowerCase()) ||
      assignmentSummary.toLowerCase().includes(itemSearch.toLowerCase());
    const matchesAssignment =
      itemAssignmentFilter === 'all' ? true :
      itemAssignmentFilter === 'unassigned' ? item.ownerCharacterId === null && item.locationId === null :
      itemAssignmentFilter === 'owned' ? item.ownerCharacterId !== null : item.locationId !== null;
    return matchesSearch && matchesAssignment;
  });

  return (
    <ItemWorkspace
      changedItemIds={new Set()}
      characters={characters}
      createItemForm={createItemForm}
      editItemForm={editItemForm}
      filteredItems={filteredItems}
      isCreatingItem={isCreatingItem}
      isDeletingItem={isDeletingItem}
      isLoadingItemDetails={isLoadingItemDetails}
      isLoadingItems={isLoading}
      isUpdatingItem={isUpdatingItem}
      itemAssignmentFilter={itemAssignmentFilter}
      itemSearch={itemSearch}
      items={items}
      locations={locations}
      onCreateItem={handleCreateItem}
      onCreateItemFormChange={(changes) => setCreateItemForm(c => ({...c, ...changes}))}
      onDeleteItem={handleDeleteItem}
      onEditItemFormChange={(changes) => setEditItemForm(c => ({...c, ...changes}))}
      onItemAssignmentFilterChange={setItemAssignmentFilter}
      onItemSearchChange={setItemSearch}
      onSelectItem={setSelectedItemId}
      onUpdateItem={handleUpdateItem}
      selectedItem={selectedItem}
      selectedItemId={selectedItemId}
      selectedItemStatus={selectedItemStatus}
      tick={tick}
    />
  );
}
