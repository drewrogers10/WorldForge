import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Item } from '@shared/item';
import type { TemporalDetailStatus } from '@shared/temporal';
import { useTopBarControls } from '@renderer/components/TopBarControls';
import {
  areFormStatesEqual,
  emptyItemForm,
  getErrorMessage,
  type ItemFormState,
} from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';
import { useEntityStore } from '@renderer/store/entityStore';
import { useSidebarStore } from '@renderer/store/sidebarStore';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';
import { useWorldStore } from '@renderer/store/worldStore';
import { ItemWorkspace } from './ItemWorkspace';

function toItemForm(item: Item, effectiveTick: number): ItemFormState {
  return {
    name: item.name,
    summary: item.summary,
    quantity: item.quantity,
    ownerCharacterId: item.ownerCharacterId,
    locationId: item.locationId,
    effectiveTick,
  };
}

function getDiscardMessage(mode: WorkspaceMode): string {
  return mode === 'create'
    ? 'Discard this new item draft?'
    : 'Discard unsaved changes to this item?';
}

export function ItemPage() {
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { characters, locations, items, isLoading, loadWorldData } = useWorldStore();
  const { selectedItemId, setSelectedItemId } = useEntityStore();
  const loadSidebarData = useSidebarStore((state) => state.loadSidebarData);
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [mode, setMode] = useState<WorkspaceMode>('browse');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedItemStatus, setSelectedItemStatus] =
    useState<TemporalDetailStatus>('missing');
  const [itemSearch, setItemSearch] = useState('');
  const [itemAssignmentFilter, setItemAssignmentFilter] = useState('all');
  const [createItemForm, setCreateItemForm] = useState<ItemFormState>(emptyItemForm(committedTick));
  const [editItemForm, setEditItemForm] = useState<ItemFormState>(emptyItemForm(committedTick));
  const [isLoadingItemDetails, setIsLoadingItemDetails] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const reloadItemDetail = useCallback(
    async (itemId: number, asOfTick: number, effectiveTick: number) => {
      const detail = await window.worldForge.getItem({
        id: itemId,
        asOfTick,
      });

      setSelectedItemStatus(detail.status);
      setSelectedItem(detail.record);
      setEditItemForm(
        detail.record ? toItemForm(detail.record, effectiveTick) : emptyItemForm(effectiveTick),
      );
    },
    [],
  );

  useEffect(() => {
    setCreateItemForm((current) => ({ ...current, effectiveTick: committedTick }));
    setEditItemForm((current) => ({ ...current, effectiveTick: committedTick }));
  }, [committedTick]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadWorldData(tick);
    }, 50);

    return () => clearTimeout(timeout);
  }, [loadWorldData, tick]);

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
        await reloadItemDetail(selectedItemId, tick, committedTick);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoadingItemDetails(false);
      }
    }

    const timeout = setTimeout(() => {
      void loadDetails();
    }, 50);

    return () => clearTimeout(timeout);
  }, [committedTick, reloadItemDetail, selectedItemId, setErrorMessage, tick]);

  const createBaseline = useMemo(() => emptyItemForm(committedTick), [committedTick]);
  const editBaseline = useMemo(
    () => (selectedItem ? toItemForm(selectedItem, committedTick) : emptyItemForm(committedTick)),
    [committedTick, selectedItem],
  );
  const isDirty =
    mode === 'create'
      ? !areFormStatesEqual(createItemForm, createBaseline)
      : mode === 'edit'
        ? !areFormStatesEqual(editItemForm, editBaseline)
        : false;
  const isSavingItem = isCreatingItem || isUpdatingItem || isDeletingItem;
  const activeForm = mode === 'create' ? createItemForm : editItemForm;

  const confirmItemNavigation = useCallback(() => {
    if (!isDirty) {
      return true;
    }

    return window.confirm(getDiscardMessage(mode));
  }, [isDirty, mode]);

  const handleSelectItem = useCallback(
    (id: number) => {
      if (id === selectedItemId) {
        return;
      }

      if (!confirmItemNavigation()) {
        return;
      }

      setSelectedItemId(id);
      setMode('browse');
    },
    [confirmItemNavigation, selectedItemId, setSelectedItemId],
  );

  const handleStartCreate = useCallback(() => {
    if (!confirmItemNavigation()) {
      return;
    }

    setCreateItemForm(emptyItemForm(committedTick));
    setMode('create');
  }, [committedTick, confirmItemNavigation]);

  const handleStartEdit = useCallback(() => {
    if (selectedItemId === null || selectedItemStatus !== 'active' || !selectedItem) {
      return;
    }

    if (!confirmItemNavigation()) {
      return;
    }

    setEditItemForm(toItemForm(selectedItem, committedTick));
    setMode('edit');
  }, [
    committedTick,
    confirmItemNavigation,
    selectedItem,
    selectedItemId,
    selectedItemStatus,
  ]);

  const handleCancelMode = useCallback(() => {
    if (mode === 'create') {
      setCreateItemForm(emptyItemForm(committedTick));
    } else if (mode === 'edit') {
      setEditItemForm(editBaseline);
    }

    setMode('browse');
  }, [committedTick, editBaseline, mode]);

  const handleCreateItem = useCallback(async () => {
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
        reloadItemDetail(created.id, tick, committedTick),
      ]);

      setMode('edit');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingItem(false);
    }
  }, [
    committedTick,
    createItemForm,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadItemDetail,
    setErrorMessage,
    setSelectedItemId,
    tick,
  ]);

  const handleUpdateItem = useCallback(async () => {
    if (selectedItemId === null) {
      return;
    }

    setIsUpdatingItem(true);
    setErrorMessage(null);

    try {
      await window.worldForge.updateItem({
        id: selectedItemId,
        ...editItemForm,
      });

      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
        reloadItemDetail(selectedItemId, tick, committedTick),
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdatingItem(false);
    }
  }, [
    committedTick,
    editItemForm,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadItemDetail,
    selectedItemId,
    setErrorMessage,
    tick,
  ]);

  const handleDeleteItem = useCallback(async () => {
    if (selectedItemId === null || isDeletingItem) {
      return;
    }

    if (!window.confirm('End this item at the selected effective time?')) {
      return;
    }

    setIsDeletingItem(true);
    setErrorMessage(null);

    try {
      await window.worldForge.deleteItem({
        id: selectedItemId,
        effectiveTick: committedTick,
      });

      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
        reloadItemDetail(selectedItemId, tick, committedTick),
      ]);

      setMode('browse');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDeletingItem(false);
    }
  }, [
    committedTick,
    isDeletingItem,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadItemDetail,
    selectedItemId,
    setErrorMessage,
    tick,
  ]);

  const handleSaveItem = useCallback(async () => {
    if (mode === 'create') {
      await handleCreateItem();
      return;
    }

    if (mode === 'edit') {
      await handleUpdateItem();
    }
  }, [handleCreateItem, handleUpdateItem, mode]);

  const filteredItems = items.filter((item) => {
    const assignmentSummary = item.ownerCharacter?.name ?? item.location?.name ?? 'Unassigned';
    const matchesSearch =
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.summary.toLowerCase().includes(itemSearch.toLowerCase()) ||
      assignmentSummary.toLowerCase().includes(itemSearch.toLowerCase());
    const matchesAssignment =
      itemAssignmentFilter === 'all'
        ? true
        : itemAssignmentFilter === 'unassigned'
          ? item.ownerCharacterId === null && item.locationId === null
          : itemAssignmentFilter === 'owned'
            ? item.ownerCharacterId !== null
            : item.locationId !== null;

    return matchesSearch && matchesAssignment;
  });

  const canEditItem =
    selectedItemId !== null &&
    selectedItemStatus === 'active' &&
    !isLoadingItemDetails;
  const canSaveItem =
    mode === 'create'
      ? createItemForm.name.trim().length > 0
      : mode === 'edit'
        ? selectedItemId !== null && editItemForm.name.trim().length > 0
        : false;

  const topBarConfig = useMemo(
    () => ({
      actions: [
        {
          id: 'add-item',
          label: 'Add',
          onSelect: handleStartCreate,
          variant: 'primary' as const,
          visible: mode === 'browse',
        },
        {
          id: 'edit-item',
          label: 'Edit',
          onSelect: handleStartEdit,
          variant: 'secondary' as const,
          disabled: !canEditItem,
          visible: mode === 'browse',
        },
        {
          id: 'save-item',
          label: isCreatingItem ? 'Creating...' : isUpdatingItem ? 'Saving...' : 'Save',
          onSelect: handleSaveItem,
          variant: 'primary' as const,
          disabled: !canSaveItem || isSavingItem,
          visible: mode !== 'browse',
        },
        {
          id: 'cancel-item',
          label: 'Cancel',
          onSelect: handleCancelMode,
          variant: 'secondary' as const,
          disabled: isSavingItem,
          visible: mode !== 'browse',
        },
        {
          id: 'end-item',
          label: isDeletingItem ? 'Ending...' : 'End',
          onSelect: handleDeleteItem,
          variant: 'danger' as const,
          disabled: !canEditItem || isSavingItem,
          visible: mode === 'edit',
        },
      ],
      confirmNavigation: confirmItemNavigation,
      isBusy: isLoadingItemDetails || isSavingItem,
      modeLabel:
        mode === 'create'
          ? 'Creating Item'
          : mode === 'edit'
            ? 'Editing Item'
            : 'Browsing Items',
      ...(selectedItem
        ? { selectionLabel: `Item: ${selectedItem.name}` }
        : selectedItemId === null
          ? { selectionLabel: 'No item selected' }
          : {}),
    }),
    [
      canEditItem,
      canSaveItem,
      confirmItemNavigation,
      handleCancelMode,
      handleDeleteItem,
      handleSaveItem,
      handleStartCreate,
      handleStartEdit,
      isCreatingItem,
      isDeletingItem,
      isLoadingItemDetails,
      isSavingItem,
      isUpdatingItem,
      mode,
      selectedItem,
      selectedItemId,
    ],
  );

  useTopBarControls(topBarConfig);

  return (
    <ItemWorkspace
      activeForm={activeForm}
      changedItemIds={new Set()}
      characters={characters}
      filteredItems={filteredItems}
      isLoadingItemDetails={isLoadingItemDetails}
      isLoadingItems={isLoading}
      isSavingItem={isSavingItem}
      itemAssignmentFilter={itemAssignmentFilter}
      itemSearch={itemSearch}
      items={items}
      locations={locations}
      mode={mode}
      onFormChange={(changes) => {
        if (mode === 'create') {
          setCreateItemForm((current) => ({ ...current, ...changes }));
          return;
        }

        setEditItemForm((current) => ({ ...current, ...changes }));
      }}
      onItemAssignmentFilterChange={setItemAssignmentFilter}
      onItemSearchChange={setItemSearch}
      onSelectItem={handleSelectItem}
      onSubmit={handleSaveItem}
      selectedItem={selectedItem}
      selectedItemId={selectedItemId}
      selectedItemStatus={selectedItemStatus}
      tick={tick}
    />
  );
}
