import { useEffect, useState, type FormEvent } from 'react';
import { LocationWorkspace } from './LocationWorkspace';
import { emptyLocationForm, getErrorMessage, type LocationFormState } from '@renderer/lib/forms';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useWorldStore } from '@renderer/store/worldStore';
import { useEntityStore } from '@renderer/store/entityStore';
import { useUiStore } from '@renderer/store/uiStore';
import type { TemporalDetailStatus } from '@shared/temporal';
import type { Location } from '@shared/location';

export function LocationPage() {
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { characters, locations, items, isLoading, loadWorldData } = useWorldStore();
  const { selectedLocationId, setSelectedLocationId } = useEntityStore();
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedLocationStatus, setSelectedLocationStatus] = useState<TemporalDetailStatus>('missing');
  const [createLocationForm, setCreateLocationForm] = useState<LocationFormState>(emptyLocationForm(committedTick));
  const [editLocationForm, setEditLocationForm] = useState<LocationFormState>(emptyLocationForm(committedTick));

  const [isLoadingLocationDetails, setIsLoadingLocationDetails] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);

  useEffect(() => {
    setCreateLocationForm((current) => ({ ...current, effectiveTick: committedTick }));
    setEditLocationForm((current) => ({ ...current, effectiveTick: committedTick }));
  }, [committedTick]);

  useEffect(() => {
    const timeout = setTimeout(() => { void loadWorldData(tick); }, 50);
    return () => clearTimeout(timeout);
  }, [tick, loadWorldData]);

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
        const detail = await window.worldForge.getLocation({ id: selectedLocationId, asOfTick: tick });
        if (detail) {
          setSelectedLocationStatus(detail.status);
          setSelectedLocation(detail.record);
          setEditLocationForm(detail.record ? {
            name: detail.record.name,
            summary: detail.record.summary,
            effectiveTick: committedTick
          } : emptyLocationForm(committedTick));
        }
      } catch (e) { setErrorMessage(getErrorMessage(e)); } 
      finally { setIsLoadingLocationDetails(false); }
    }
    const timeout = setTimeout(() => { void loadDetails(); }, 50);
    return () => clearTimeout(timeout);
  }, [tick, selectedLocationId, committedTick, setErrorMessage]);

  async function handleCreateLocation(e: FormEvent) {
    e.preventDefault();
    setIsCreatingLocation(true);
    setErrorMessage(null);
    try {
      const created = await window.worldForge.createLocation(createLocationForm);
      setSelectedLocationId(created.id);
      setCreateLocationForm(emptyLocationForm(committedTick));
      await refreshTimeline();
      await loadWorldData(committedTick);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsCreatingLocation(false); }
  }

  async function handleUpdateLocation(e: FormEvent) {
    e.preventDefault();
    if (selectedLocationId === null) return;
    setIsUpdatingLocation(true);
    setErrorMessage(null);
    try {
      await window.worldForge.updateLocation({ id: selectedLocationId, ...editLocationForm });
      await refreshTimeline();
      await loadWorldData(committedTick);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsUpdatingLocation(false); }
  }

  async function handleDeleteLocation() {
    if (selectedLocationId === null || isDeletingLocation) return;
    if (!window.confirm('End this place at the selected effective time?')) return;
    setIsDeletingLocation(true);
    setErrorMessage(null);
    try {
      await window.worldForge.deleteLocation({ id: selectedLocationId, effectiveTick: committedTick });
      await refreshTimeline();
      await loadWorldData(committedTick);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsDeletingLocation(false); }
  }

  const selectedLocationCharacterCount = selectedLocation
    ? characters.filter((character) => character.locationId === selectedLocation.id).length
    : 0;
  const selectedLocationItemCount = selectedLocation
    ? items.filter((item) => item.locationId === selectedLocation.id).length
    : 0;

  return (
    <LocationWorkspace
      changedLocationIds={new Set()}
      characters={characters}
      createLocationForm={createLocationForm}
      editLocationForm={editLocationForm}
      isCreatingLocation={isCreatingLocation}
      isDeletingLocation={isDeletingLocation}
      isLoadingLocationDetails={isLoadingLocationDetails}
      isLoadingLocations={isLoading}
      isUpdatingLocation={isUpdatingLocation}
      linkedItemCount={selectedLocationItemCount}
      locations={locations}
      onCreateLocation={handleCreateLocation}
      onCreateLocationFormChange={(changes) => setCreateLocationForm(c => ({...c, ...changes}))}
      onDeleteLocation={handleDeleteLocation}
      onEditLocationFormChange={(changes) => setEditLocationForm(c => ({...c, ...changes}))}
      onSelectLocation={setSelectedLocationId}
      onUpdateLocation={handleUpdateLocation}
      selectedLocation={selectedLocation}
      selectedLocationCharacterCount={selectedLocationCharacterCount}
      selectedLocationId={selectedLocationId}
      selectedLocationStatus={selectedLocationStatus}
      tick={tick}
    />
  );
}
