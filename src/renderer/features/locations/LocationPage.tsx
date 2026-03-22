import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Location } from '@shared/location';
import type { TemporalDetailStatus } from '@shared/temporal';
import { EntityLinksPanel } from '@renderer/components/EntityLinksPanel';
import { useTopBarControls } from '@renderer/components/TopBarControls';
import {
  areFormStatesEqual,
  emptyLocationForm,
  getErrorMessage,
  type LocationFormState,
} from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';
import { useEntityStore } from '@renderer/store/entityStore';
import { useSidebarStore } from '@renderer/store/sidebarStore';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';
import { useWorldStore } from '@renderer/store/worldStore';
import { LocationWorkspace } from './LocationWorkspace';

function toLocationForm(location: Location, effectiveTick: number): LocationFormState {
  return {
    name: location.name,
    summary: location.summary,
    effectiveTick,
  };
}

function getDiscardMessage(mode: WorkspaceMode): string {
  return mode === 'create'
    ? 'Discard this new place draft?'
    : 'Discard unsaved changes to this place?';
}

export function LocationPage() {
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { characters, locations, items, isLoading, loadWorldData } = useWorldStore();
  const { selectedLocationId, setSelectedLocationId } = useEntityStore();
  const loadSidebarData = useSidebarStore((state) => state.loadSidebarData);
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [mode, setMode] = useState<WorkspaceMode>('browse');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedLocationStatus, setSelectedLocationStatus] =
    useState<TemporalDetailStatus>('missing');
  const [createLocationForm, setCreateLocationForm] = useState<LocationFormState>(
    emptyLocationForm(committedTick),
  );
  const [editLocationForm, setEditLocationForm] = useState<LocationFormState>(
    emptyLocationForm(committedTick),
  );
  const [isLoadingLocationDetails, setIsLoadingLocationDetails] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);

  const reloadLocationDetail = useCallback(
    async (locationId: number, asOfTick: number, effectiveTick: number) => {
      const detail = await window.worldForge.getLocation({
        id: locationId,
        asOfTick,
      });

      setSelectedLocationStatus(detail.status);
      setSelectedLocation(detail.record);
      setEditLocationForm(
        detail.record ? toLocationForm(detail.record, effectiveTick) : emptyLocationForm(effectiveTick),
      );
    },
    [],
  );

  useEffect(() => {
    setCreateLocationForm((current) => ({ ...current, effectiveTick: committedTick }));
    setEditLocationForm((current) => ({ ...current, effectiveTick: committedTick }));
  }, [committedTick]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadWorldData(tick);
    }, 50);

    return () => clearTimeout(timeout);
  }, [loadWorldData, tick]);

  useEffect(() => {
    async function loadDetails() {
      if (selectedLocationId === null) {
        setSelectedLocation(null);
        setSelectedLocationStatus('missing');
        return;
      }

      setIsLoadingLocationDetails(true);
      setErrorMessage(null);

      try {
        await reloadLocationDetail(selectedLocationId, tick, committedTick);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoadingLocationDetails(false);
      }
    }

    const timeout = setTimeout(() => {
      void loadDetails();
    }, 50);

    return () => clearTimeout(timeout);
  }, [committedTick, reloadLocationDetail, selectedLocationId, setErrorMessage, tick]);

  const createBaseline = useMemo(() => emptyLocationForm(committedTick), [committedTick]);
  const editBaseline = useMemo(
    () =>
      selectedLocation
        ? toLocationForm(selectedLocation, committedTick)
        : emptyLocationForm(committedTick),
    [committedTick, selectedLocation],
  );
  const isDirty =
    mode === 'create'
      ? !areFormStatesEqual(createLocationForm, createBaseline)
      : mode === 'edit'
        ? !areFormStatesEqual(editLocationForm, editBaseline)
        : false;
  const isSavingLocation = isCreatingLocation || isUpdatingLocation || isDeletingLocation;
  const activeForm = mode === 'create' ? createLocationForm : editLocationForm;

  const confirmLocationNavigation = useCallback(() => {
    if (!isDirty) {
      return true;
    }

    return window.confirm(getDiscardMessage(mode));
  }, [isDirty, mode]);

  const handleSelectLocation = useCallback(
    (id: number) => {
      if (id === selectedLocationId) {
        return;
      }

      if (!confirmLocationNavigation()) {
        return;
      }

      setSelectedLocationId(id);
      setMode('browse');
    },
    [confirmLocationNavigation, selectedLocationId, setSelectedLocationId],
  );

  const handleStartCreate = useCallback(() => {
    if (!confirmLocationNavigation()) {
      return;
    }

    setCreateLocationForm(emptyLocationForm(committedTick));
    setMode('create');
  }, [committedTick, confirmLocationNavigation]);

  const handleStartEdit = useCallback(() => {
    if (selectedLocationId === null || selectedLocationStatus !== 'active' || !selectedLocation) {
      return;
    }

    if (!confirmLocationNavigation()) {
      return;
    }

    setEditLocationForm(toLocationForm(selectedLocation, committedTick));
    setMode('edit');
  }, [
    committedTick,
    confirmLocationNavigation,
    selectedLocation,
    selectedLocationId,
    selectedLocationStatus,
  ]);

  const handleCancelMode = useCallback(() => {
    if (mode === 'create') {
      setCreateLocationForm(emptyLocationForm(committedTick));
    } else if (mode === 'edit') {
      setEditLocationForm(editBaseline);
    }

    setMode('browse');
  }, [committedTick, editBaseline, mode]);

  const handleCreateLocation = useCallback(async () => {
    setIsCreatingLocation(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createLocation(createLocationForm);
      setSelectedLocationId(created.id);
      setCreateLocationForm(emptyLocationForm(committedTick));

      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
        reloadLocationDetail(created.id, tick, committedTick),
      ]);

      setMode('edit');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingLocation(false);
    }
  }, [
    committedTick,
    createLocationForm,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadLocationDetail,
    setErrorMessage,
    setSelectedLocationId,
    tick,
  ]);

  const handleUpdateLocation = useCallback(async () => {
    if (selectedLocationId === null) {
      return;
    }

    setIsUpdatingLocation(true);
    setErrorMessage(null);

    try {
      await window.worldForge.updateLocation({
        id: selectedLocationId,
        ...editLocationForm,
      });

      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
        reloadLocationDetail(selectedLocationId, tick, committedTick),
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdatingLocation(false);
    }
  }, [
    committedTick,
    editLocationForm,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadLocationDetail,
    selectedLocationId,
    setErrorMessage,
    tick,
  ]);

  const handleDeleteLocation = useCallback(async () => {
    if (selectedLocationId === null || isDeletingLocation) {
      return;
    }

    if (!window.confirm('End this place at the selected effective time?')) {
      return;
    }

    setIsDeletingLocation(true);
    setErrorMessage(null);

    try {
      await window.worldForge.deleteLocation({
        id: selectedLocationId,
        effectiveTick: committedTick,
      });

      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
        reloadLocationDetail(selectedLocationId, tick, committedTick),
      ]);

      setMode('browse');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDeletingLocation(false);
    }
  }, [
    committedTick,
    isDeletingLocation,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadLocationDetail,
    selectedLocationId,
    setErrorMessage,
    tick,
  ]);

  const handleSaveLocation = useCallback(async () => {
    if (mode === 'create') {
      await handleCreateLocation();
      return;
    }

    if (mode === 'edit') {
      await handleUpdateLocation();
    }
  }, [handleCreateLocation, handleUpdateLocation, mode]);

  const selectedLocationCharacterCount = selectedLocation
    ? characters.filter((character) => character.locationId === selectedLocation.id).length
    : 0;
  const selectedLocationItemCount = selectedLocation
    ? items.filter((item) => item.locationId === selectedLocation.id).length
    : 0;
  const canEditLocation =
    selectedLocationId !== null &&
    selectedLocationStatus === 'active' &&
    !isLoadingLocationDetails;
  const canSaveLocation =
    mode === 'create'
      ? createLocationForm.name.trim().length > 0
      : mode === 'edit'
        ? selectedLocationId !== null && editLocationForm.name.trim().length > 0
        : false;

  const topBarConfig = useMemo(
    () => ({
      actions: [
        {
          id: 'add-location',
          label: 'Add',
          onSelect: handleStartCreate,
          variant: 'primary' as const,
          visible: mode === 'browse',
        },
        {
          id: 'edit-location',
          label: 'Edit',
          onSelect: handleStartEdit,
          variant: 'secondary' as const,
          disabled: !canEditLocation,
          visible: mode === 'browse',
        },
        {
          id: 'save-location',
          label: isCreatingLocation ? 'Creating...' : isUpdatingLocation ? 'Saving...' : 'Save',
          onSelect: handleSaveLocation,
          variant: 'primary' as const,
          disabled: !canSaveLocation || isSavingLocation,
          visible: mode !== 'browse',
        },
        {
          id: 'cancel-location',
          label: 'Cancel',
          onSelect: handleCancelMode,
          variant: 'secondary' as const,
          disabled: isSavingLocation,
          visible: mode !== 'browse',
        },
        {
          id: 'end-location',
          label: isDeletingLocation ? 'Ending...' : 'End',
          onSelect: handleDeleteLocation,
          variant: 'danger' as const,
          disabled: !canEditLocation || isSavingLocation,
          visible: mode === 'edit',
        },
      ],
      confirmNavigation: confirmLocationNavigation,
      isBusy: isLoadingLocationDetails || isSavingLocation,
      modeLabel:
        mode === 'create'
          ? 'Creating Place'
          : mode === 'edit'
            ? 'Editing Place'
            : 'Browsing Places',
      ...(selectedLocation
        ? { selectionLabel: `Place: ${selectedLocation.name}` }
        : selectedLocationId === null
          ? { selectionLabel: 'No place selected' }
          : {}),
    }),
    [
      canEditLocation,
      canSaveLocation,
      confirmLocationNavigation,
      handleCancelMode,
      handleDeleteLocation,
      handleSaveLocation,
      handleStartCreate,
      handleStartEdit,
      isCreatingLocation,
      isDeletingLocation,
      isLoadingLocationDetails,
      isSavingLocation,
      isUpdatingLocation,
      mode,
      selectedLocation,
      selectedLocationId,
    ],
  );

  useTopBarControls(topBarConfig);

  return (
    <LocationWorkspace
      activeForm={activeForm}
      changedLocationIds={new Set()}
      characters={characters}
      isLoadingLocationDetails={isLoadingLocationDetails}
      isLoadingLocations={isLoading}
      isSavingLocation={isSavingLocation}
      linkedItemCount={selectedLocationItemCount}
      linksSlot={
        <EntityLinksPanel
          entityId={selectedLocationId}
          entityKind="location"
          emptyMessage="Select a place to manage its linked files."
          title="Place Links"
        />
      }
      locations={locations}
      mode={mode}
      onFormChange={(changes) => {
        if (mode === 'create') {
          setCreateLocationForm((current) => ({ ...current, ...changes }));
          return;
        }

        setEditLocationForm((current) => ({ ...current, ...changes }));
      }}
      onSelectLocation={handleSelectLocation}
      onSubmit={handleSaveLocation}
      selectedLocation={selectedLocation}
      selectedLocationCharacterCount={selectedLocationCharacterCount}
      selectedLocationId={selectedLocationId}
      selectedLocationStatus={selectedLocationStatus}
      tick={tick}
    />
  );
}
