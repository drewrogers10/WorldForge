import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import { AppShell } from '@renderer/components/AppShell';
import { CharacterWorkspace } from '@renderer/features/characters/CharacterWorkspace';
import { LocationWorkspace } from '@renderer/features/locations/LocationWorkspace';
import {
  emptyCharacterForm,
  emptyLocationForm,
  getErrorMessage,
  type CharacterFormState,
  type LocationFormState,
  type WorkspaceView,
} from '@renderer/lib/forms';

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>('characters');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [characterSearch, setCharacterSearch] = useState('');
  const [characterLocationFilter, setCharacterLocationFilter] = useState('all');
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [createCharacterForm, setCreateCharacterForm] =
    useState<CharacterFormState>(emptyCharacterForm);
  const [editCharacterForm, setEditCharacterForm] =
    useState<CharacterFormState>(emptyCharacterForm);
  const [createLocationForm, setCreateLocationForm] =
    useState<LocationFormState>(emptyLocationForm);
  const [editLocationForm, setEditLocationForm] =
    useState<LocationFormState>(emptyLocationForm);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [isLoadingCharacterDetails, setIsLoadingCharacterDetails] = useState(false);
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [isUpdatingCharacter, setIsUpdatingCharacter] = useState(false);
  const [isDeletingCharacter, setIsDeletingCharacter] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingLocationDetails, setIsLoadingLocationDetails] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void initializeData();
  }, []);

  useEffect(() => {
    if (selectedCharacterId === null) {
      syncSelectedCharacter(null);
      return;
    }

    void loadCharacter(selectedCharacterId);
  }, [selectedCharacterId]);

  useEffect(() => {
    if (selectedLocationId === null) {
      syncSelectedLocation(null);
      return;
    }

    void loadLocation(selectedLocationId);
  }, [selectedLocationId]);

  function syncSelectedCharacter(record: Character | null): void {
    setSelectedCharacter(record);
    setEditCharacterForm(
      record
        ? {
            name: record.name,
            summary: record.summary,
            locationId: record.locationId,
          }
        : emptyCharacterForm(),
    );
  }

  function syncSelectedLocation(record: Location | null): void {
    setSelectedLocation(record);
    setEditLocationForm(
      record
        ? {
            name: record.name,
            summary: record.summary,
          }
        : emptyLocationForm(),
    );
  }

  function updateCreateCharacterForm(changes: Partial<CharacterFormState>): void {
    setCreateCharacterForm((current) => ({
      ...current,
      ...changes,
    }));
  }

  function updateEditCharacterForm(changes: Partial<CharacterFormState>): void {
    setEditCharacterForm((current) => ({
      ...current,
      ...changes,
    }));
  }

  function updateCreateLocationForm(changes: Partial<LocationFormState>): void {
    setCreateLocationForm((current) => ({
      ...current,
      ...changes,
    }));
  }

  function updateEditLocationForm(changes: Partial<LocationFormState>): void {
    setEditLocationForm((current) => ({
      ...current,
      ...changes,
    }));
  }

  async function initializeData(): Promise<void> {
    await Promise.all([refreshLocations(), refreshCharacters()]);
  }

  async function refreshCharacters(preferredId?: number): Promise<Character[]> {
    setIsLoadingCharacters(true);
    setErrorMessage(null);

    try {
      const records = await window.worldForge.listCharacters();
      setCharacters(records);

      setSelectedCharacterId((currentId) => {
        if (
          preferredId !== undefined &&
          records.some((record) => record.id === preferredId)
        ) {
          return preferredId;
        }

        if (
          currentId !== null &&
          records.some((record) => record.id === currentId)
        ) {
          return currentId;
        }

        return records[0]?.id ?? null;
      });

      return records;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return [];
    } finally {
      setIsLoadingCharacters(false);
    }
  }

  async function refreshLocations(preferredId?: number): Promise<Location[]> {
    setIsLoadingLocations(true);
    setErrorMessage(null);

    try {
      const records = await window.worldForge.listLocations();
      setLocations(records);

      setSelectedLocationId((currentId) => {
        if (
          preferredId !== undefined &&
          records.some((record) => record.id === preferredId)
        ) {
          return preferredId;
        }

        if (
          currentId !== null &&
          records.some((record) => record.id === currentId)
        ) {
          return currentId;
        }

        return records[0]?.id ?? null;
      });

      return records;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return [];
    } finally {
      setIsLoadingLocations(false);
    }
  }

  async function loadCharacter(id: number): Promise<void> {
    setIsLoadingCharacterDetails(true);
    setErrorMessage(null);

    try {
      const record = await window.worldForge.getCharacter({ id });
      syncSelectedCharacter(record);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingCharacterDetails(false);
    }
  }

  async function loadLocation(id: number): Promise<void> {
    setIsLoadingLocationDetails(true);
    setErrorMessage(null);

    try {
      const record = await window.worldForge.getLocation({ id });
      syncSelectedLocation(record);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingLocationDetails(false);
    }
  }

  async function handleRefreshAll(): Promise<void> {
    setIsRefreshingAll(true);

    try {
      await Promise.all([
        refreshCharacters(selectedCharacterId ?? undefined),
        refreshLocations(selectedLocationId ?? undefined),
      ]);

      if (selectedCharacterId !== null) {
        await loadCharacter(selectedCharacterId);
      }

      if (selectedLocationId !== null) {
        await loadLocation(selectedLocationId);
      }
    } finally {
      setIsRefreshingAll(false);
    }
  }

  async function handleCreateCharacter(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsCreatingCharacter(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createCharacter(createCharacterForm);
      setCreateCharacterForm(emptyCharacterForm());
      syncSelectedCharacter(created);
      setSelectedCharacterId(created.id);
      await refreshCharacters(created.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingCharacter(false);
    }
  }

  async function handleUpdateCharacter(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (selectedCharacterId === null) {
      return;
    }

    setIsUpdatingCharacter(true);
    setErrorMessage(null);

    try {
      const updated = await window.worldForge.updateCharacter({
        id: selectedCharacterId,
        ...editCharacterForm,
      });
      syncSelectedCharacter(updated);
      await refreshCharacters(updated.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdatingCharacter(false);
    }
  }

  async function handleDeleteCharacter(): Promise<void> {
    if (selectedCharacterId === null || isDeletingCharacter) {
      return;
    }

    if (!window.confirm('Delete this character? This cannot be undone.')) {
      return;
    }

    setIsDeletingCharacter(true);
    setErrorMessage(null);

    try {
      await window.worldForge.deleteCharacter({ id: selectedCharacterId });
      syncSelectedCharacter(null);
      setSelectedCharacterId(null);
      await refreshCharacters();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDeletingCharacter(false);
    }
  }

  async function handleCreateLocation(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsCreatingLocation(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createLocation(createLocationForm);
      setCreateLocationForm(emptyLocationForm());
      syncSelectedLocation(created);
      setSelectedLocationId(created.id);
      await refreshLocations(created.id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingLocation(false);
    }
  }

  async function handleUpdateLocation(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (selectedLocationId === null) {
      return;
    }

    setIsUpdatingLocation(true);
    setErrorMessage(null);

    try {
      const updated = await window.worldForge.updateLocation({
        id: selectedLocationId,
        ...editLocationForm,
      });
      syncSelectedLocation(updated);
      await refreshLocations(updated.id);

      if (characters.some((character) => character.locationId === updated.id)) {
        await refreshCharacters(selectedCharacterId ?? undefined);

        if (selectedCharacter?.locationId === updated.id && selectedCharacterId !== null) {
          await loadCharacter(selectedCharacterId);
        }
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdatingLocation(false);
    }
  }

  const normalizedSearch = characterSearch.trim().toLowerCase();
  const filteredCharacters = characters.filter((character) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      character.name.toLowerCase().includes(normalizedSearch) ||
      character.summary.toLowerCase().includes(normalizedSearch) ||
      character.location?.name.toLowerCase().includes(normalizedSearch);

    const matchesLocation =
      characterLocationFilter === 'all'
        ? true
        : characterLocationFilter === 'unassigned'
          ? character.locationId === null
          : character.locationId === Number(characterLocationFilter);

    return matchesSearch && matchesLocation;
  });

  const selectedLocationCharacterCount = selectedLocation
    ? characters.filter((character) => character.locationId === selectedLocation.id)
        .length
    : 0;

  return (
    <AppShell
      activeView={activeView}
      errorMessage={errorMessage}
      isRefreshing={isRefreshingAll}
      onRefresh={handleRefreshAll}
      onViewChange={setActiveView}
    >
      {activeView === 'characters' ? (
        <CharacterWorkspace
          characterLocationFilter={characterLocationFilter}
          characterSearch={characterSearch}
          characters={characters}
          createCharacterForm={createCharacterForm}
          editCharacterForm={editCharacterForm}
          filteredCharacters={filteredCharacters}
          isCreatingCharacter={isCreatingCharacter}
          isDeletingCharacter={isDeletingCharacter}
          isLoadingCharacterDetails={isLoadingCharacterDetails}
          isLoadingCharacters={isLoadingCharacters}
          isUpdatingCharacter={isUpdatingCharacter}
          locations={locations}
          onCharacterLocationFilterChange={setCharacterLocationFilter}
          onCharacterSearchChange={setCharacterSearch}
          onCreateCharacter={handleCreateCharacter}
          onCreateCharacterFormChange={updateCreateCharacterForm}
          onDeleteCharacter={handleDeleteCharacter}
          onEditCharacterFormChange={updateEditCharacterForm}
          onSelectCharacter={setSelectedCharacterId}
          onUpdateCharacter={handleUpdateCharacter}
          selectedCharacter={selectedCharacter}
          selectedCharacterId={selectedCharacterId}
        />
      ) : (
        <LocationWorkspace
          characters={characters}
          createLocationForm={createLocationForm}
          editLocationForm={editLocationForm}
          isCreatingLocation={isCreatingLocation}
          isLoadingLocationDetails={isLoadingLocationDetails}
          isLoadingLocations={isLoadingLocations}
          isUpdatingLocation={isUpdatingLocation}
          locations={locations}
          onCreateLocation={handleCreateLocation}
          onCreateLocationFormChange={updateCreateLocationForm}
          onEditLocationFormChange={updateEditLocationForm}
          onSelectLocation={setSelectedLocationId}
          onUpdateLocation={handleUpdateLocation}
          selectedLocation={selectedLocation}
          selectedLocationCharacterCount={selectedLocationCharacterCount}
          selectedLocationId={selectedLocationId}
        />
      )}
    </AppShell>
  );
}
