import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { FormEvent } from 'react';
import type { Character } from '@shared/character';
import type { Item } from '@shared/item';
import type { Location } from '@shared/location';
import { CharacterWorkspace } from '@renderer/features/characters/CharacterWorkspace';
import { EntityWorkspacePlaceholder } from '@renderer/features/entities/EntityWorkspacePlaceholder';
import { ItemWorkspace } from '@renderer/features/items/ItemWorkspace';
import { LocationWorkspace } from '@renderer/features/locations/LocationWorkspace';
import {
  emptyCharacterForm,
  emptyItemForm,
  emptyLocationForm,
  getErrorMessage,
  type CharacterFormState,
  type ItemFormState,
  type LocationFormState,
  type WorkspaceView,
} from '@renderer/lib/forms';

export type WorldWorkshopHandle = {
  refreshAll: () => Promise<void>;
};

type WorldWorkshopProps = {
  activeView: WorkspaceView;
  onErrorChange: (message: string | null) => void;
};

export const WorldWorkshop = forwardRef<WorldWorkshopHandle, WorldWorkshopProps>(
  function WorldWorkshop({ activeView, onErrorChange }, ref) {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [characterSearch, setCharacterSearch] = useState('');
    const [characterLocationFilter, setCharacterLocationFilter] = useState('all');
    const [itemSearch, setItemSearch] = useState('');
    const [itemAssignmentFilter, setItemAssignmentFilter] = useState('all');
    const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [createCharacterForm, setCreateCharacterForm] =
      useState<CharacterFormState>(emptyCharacterForm);
    const [editCharacterForm, setEditCharacterForm] =
      useState<CharacterFormState>(emptyCharacterForm);
    const [createLocationForm, setCreateLocationForm] =
      useState<LocationFormState>(emptyLocationForm);
    const [editLocationForm, setEditLocationForm] =
      useState<LocationFormState>(emptyLocationForm);
    const [createItemForm, setCreateItemForm] = useState<ItemFormState>(emptyItemForm);
    const [editItemForm, setEditItemForm] = useState<ItemFormState>(emptyItemForm);
    const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
    const [isLoadingCharacterDetails, setIsLoadingCharacterDetails] = useState(false);
    const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
    const [isUpdatingCharacter, setIsUpdatingCharacter] = useState(false);
    const [isDeletingCharacter, setIsDeletingCharacter] = useState(false);
    const [isLoadingLocations, setIsLoadingLocations] = useState(true);
    const [isLoadingLocationDetails, setIsLoadingLocationDetails] = useState(false);
    const [isCreatingLocation, setIsCreatingLocation] = useState(false);
    const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
    const [isDeletingLocation, setIsDeletingLocation] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [isLoadingItemDetails, setIsLoadingItemDetails] = useState(false);
    const [isCreatingItem, setIsCreatingItem] = useState(false);
    const [isUpdatingItem, setIsUpdatingItem] = useState(false);
    const [isDeletingItem, setIsDeletingItem] = useState(false);

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

    useEffect(() => {
      if (selectedItemId === null) {
        syncSelectedItem(null);
        return;
      }

      void loadItem(selectedItemId);
    }, [selectedItemId]);

    useImperativeHandle(ref, () => ({
      refreshAll,
    }));

    function clearError(): void {
      onErrorChange(null);
    }

    function reportError(error: unknown): void {
      onErrorChange(getErrorMessage(error));
    }

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

    function syncSelectedItem(record: Item | null): void {
      setSelectedItem(record);
      setEditItemForm(
        record
          ? {
              name: record.name,
              summary: record.summary,
              quantity: record.quantity,
              ownerCharacterId: record.ownerCharacterId,
              locationId: record.locationId,
            }
          : emptyItemForm(),
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

    function updateCreateItemForm(changes: Partial<ItemFormState>): void {
      setCreateItemForm((current) => ({
        ...current,
        ...changes,
      }));
    }

    function updateEditItemForm(changes: Partial<ItemFormState>): void {
      setEditItemForm((current) => ({
        ...current,
        ...changes,
      }));
    }

    async function initializeData(): Promise<void> {
      await Promise.all([refreshLocations(), refreshCharacters(), refreshItems()]);
    }

    async function refreshCharacters(preferredId?: number): Promise<Character[]> {
      setIsLoadingCharacters(true);
      clearError();

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

          if (currentId !== null && records.some((record) => record.id === currentId)) {
            return currentId;
          }

          return records[0]?.id ?? null;
        });

        return records;
      } catch (error) {
        reportError(error);
        return [];
      } finally {
        setIsLoadingCharacters(false);
      }
    }

    async function refreshLocations(preferredId?: number): Promise<Location[]> {
      setIsLoadingLocations(true);
      clearError();

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

          if (currentId !== null && records.some((record) => record.id === currentId)) {
            return currentId;
          }

          return records[0]?.id ?? null;
        });

        return records;
      } catch (error) {
        reportError(error);
        return [];
      } finally {
        setIsLoadingLocations(false);
      }
    }

    async function refreshItems(preferredId?: number): Promise<Item[]> {
      setIsLoadingItems(true);
      clearError();

      try {
        const records = await window.worldForge.listItems();
        setItems(records);
        setSelectedItemId((currentId) => {
          if (
            preferredId !== undefined &&
            records.some((record) => record.id === preferredId)
          ) {
            return preferredId;
          }

          if (currentId !== null && records.some((record) => record.id === currentId)) {
            return currentId;
          }

          return records[0]?.id ?? null;
        });

        return records;
      } catch (error) {
        reportError(error);
        return [];
      } finally {
        setIsLoadingItems(false);
      }
    }

    async function loadCharacter(id: number): Promise<void> {
      setIsLoadingCharacterDetails(true);
      clearError();

      try {
        const record = await window.worldForge.getCharacter({ id });
        syncSelectedCharacter(record);
      } catch (error) {
        reportError(error);
      } finally {
        setIsLoadingCharacterDetails(false);
      }
    }

    async function loadLocation(id: number): Promise<void> {
      setIsLoadingLocationDetails(true);
      clearError();

      try {
        const record = await window.worldForge.getLocation({ id });
        syncSelectedLocation(record);
      } catch (error) {
        reportError(error);
      } finally {
        setIsLoadingLocationDetails(false);
      }
    }

    async function loadItem(id: number): Promise<void> {
      setIsLoadingItemDetails(true);
      clearError();

      try {
        const record = await window.worldForge.getItem({ id });
        syncSelectedItem(record);
      } catch (error) {
        reportError(error);
      } finally {
        setIsLoadingItemDetails(false);
      }
    }

    async function refreshAll(): Promise<void> {
      clearError();

      await Promise.all([
        refreshCharacters(selectedCharacterId ?? undefined),
        refreshLocations(selectedLocationId ?? undefined),
        refreshItems(selectedItemId ?? undefined),
      ]);

      await Promise.all([
        selectedCharacterId !== null ? loadCharacter(selectedCharacterId) : Promise.resolve(),
        selectedLocationId !== null ? loadLocation(selectedLocationId) : Promise.resolve(),
        selectedItemId !== null ? loadItem(selectedItemId) : Promise.resolve(),
      ]);
    }

    async function handleCreateCharacter(
      event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
      event.preventDefault();
      setIsCreatingCharacter(true);
      clearError();

      try {
        const created = await window.worldForge.createCharacter(createCharacterForm);
        setCreateCharacterForm(emptyCharacterForm());
        syncSelectedCharacter(created);
        setSelectedCharacterId(created.id);
        await refreshCharacters(created.id);
      } catch (error) {
        reportError(error);
      } finally {
        setIsCreatingCharacter(false);
      }
    }

    async function handleUpdateCharacter(
      event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
      event.preventDefault();

      if (selectedCharacterId === null) {
        return;
      }

      setIsUpdatingCharacter(true);
      clearError();

      try {
        const updated = await window.worldForge.updateCharacter({
          id: selectedCharacterId,
          ...editCharacterForm,
        });
        syncSelectedCharacter(updated);
        await Promise.all([
          refreshCharacters(updated.id),
          refreshItems(selectedItemId ?? undefined),
        ]);
      } catch (error) {
        reportError(error);
      } finally {
        setIsUpdatingCharacter(false);
      }
    }

    async function handleDeleteCharacter(): Promise<void> {
      if (selectedCharacterId === null || isDeletingCharacter) {
        return;
      }

      if (!window.confirm('Delete this person? This cannot be undone.')) {
        return;
      }

      setIsDeletingCharacter(true);
      clearError();

      try {
        await window.worldForge.deleteCharacter({ id: selectedCharacterId });
        syncSelectedCharacter(null);
        setSelectedCharacterId(null);
        await Promise.all([refreshCharacters(), refreshItems(selectedItemId ?? undefined)]);
      } catch (error) {
        reportError(error);
      } finally {
        setIsDeletingCharacter(false);
      }
    }

    async function handleCreateLocation(event: FormEvent<HTMLFormElement>): Promise<void> {
      event.preventDefault();
      setIsCreatingLocation(true);
      clearError();

      try {
        const created = await window.worldForge.createLocation(createLocationForm);
        setCreateLocationForm(emptyLocationForm());
        syncSelectedLocation(created);
        setSelectedLocationId(created.id);
        await refreshLocations(created.id);
      } catch (error) {
        reportError(error);
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
      clearError();

      try {
        const updated = await window.worldForge.updateLocation({
          id: selectedLocationId,
          ...editLocationForm,
        });
        syncSelectedLocation(updated);
        await Promise.all([
          refreshLocations(updated.id),
          refreshCharacters(selectedCharacterId ?? undefined),
          refreshItems(selectedItemId ?? undefined),
        ]);
      } catch (error) {
        reportError(error);
      } finally {
        setIsUpdatingLocation(false);
      }
    }

    async function handleDeleteLocation(): Promise<void> {
      if (selectedLocationId === null || isDeletingLocation) {
        return;
      }

      if (!window.confirm('Delete this place? Linked people and items will be unassigned.')) {
        return;
      }

      setIsDeletingLocation(true);
      clearError();

      try {
        await window.worldForge.deleteLocation({ id: selectedLocationId });
        syncSelectedLocation(null);
        setSelectedLocationId(null);
        await Promise.all([
          refreshLocations(),
          refreshCharacters(selectedCharacterId ?? undefined),
          refreshItems(selectedItemId ?? undefined),
        ]);
      } catch (error) {
        reportError(error);
      } finally {
        setIsDeletingLocation(false);
      }
    }

    async function handleCreateItem(event: FormEvent<HTMLFormElement>): Promise<void> {
      event.preventDefault();
      setIsCreatingItem(true);
      clearError();

      try {
        const created = await window.worldForge.createItem(createItemForm);
        setCreateItemForm(emptyItemForm());
        syncSelectedItem(created);
        setSelectedItemId(created.id);
        await refreshItems(created.id);
      } catch (error) {
        reportError(error);
      } finally {
        setIsCreatingItem(false);
      }
    }

    async function handleUpdateItem(event: FormEvent<HTMLFormElement>): Promise<void> {
      event.preventDefault();

      if (selectedItemId === null) {
        return;
      }

      setIsUpdatingItem(true);
      clearError();

      try {
        const updated = await window.worldForge.updateItem({
          id: selectedItemId,
          ...editItemForm,
        });
        syncSelectedItem(updated);
        await refreshItems(updated.id);
      } catch (error) {
        reportError(error);
      } finally {
        setIsUpdatingItem(false);
      }
    }

    async function handleDeleteItem(): Promise<void> {
      if (selectedItemId === null || isDeletingItem) {
        return;
      }

      if (!window.confirm('Delete this item? This cannot be undone.')) {
        return;
      }

      setIsDeletingItem(true);
      clearError();

      try {
        await window.worldForge.deleteItem({ id: selectedItemId });
        syncSelectedItem(null);
        setSelectedItemId(null);
        await refreshItems();
      } catch (error) {
        reportError(error);
      } finally {
        setIsDeletingItem(false);
      }
    }

    const normalizedCharacterSearch = characterSearch.trim().toLowerCase();
    const filteredCharacters = characters.filter((character) => {
      const matchesSearch =
        normalizedCharacterSearch.length === 0 ||
        character.name.toLowerCase().includes(normalizedCharacterSearch) ||
        character.summary.toLowerCase().includes(normalizedCharacterSearch) ||
        character.location?.name.toLowerCase().includes(normalizedCharacterSearch);

      const matchesLocation =
        characterLocationFilter === 'all'
          ? true
          : characterLocationFilter === 'unassigned'
            ? character.locationId === null
            : character.locationId === Number(characterLocationFilter);

      return matchesSearch && matchesLocation;
    });

    const normalizedItemSearch = itemSearch.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
      const matchesSearch =
        normalizedItemSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedItemSearch) ||
        item.summary.toLowerCase().includes(normalizedItemSearch) ||
        item.ownerCharacter?.name.toLowerCase().includes(normalizedItemSearch) ||
        item.location?.name.toLowerCase().includes(normalizedItemSearch);

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

    const selectedLocationCharacterCount = selectedLocation
      ? characters.filter((character) => character.locationId === selectedLocation.id).length
      : 0;
    const selectedLocationItemCount = selectedLocation
      ? items.filter((item) => item.locationId === selectedLocation.id).length
      : 0;

    switch (activeView) {
      case 'people':
        return (
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
        );
      case 'places':
        return (
          <LocationWorkspace
            characters={characters}
            createLocationForm={createLocationForm}
            editLocationForm={editLocationForm}
            isCreatingLocation={isCreatingLocation}
            isDeletingLocation={isDeletingLocation}
            isLoadingLocationDetails={isLoadingLocationDetails}
            isLoadingLocations={isLoadingLocations}
            isUpdatingLocation={isUpdatingLocation}
            linkedItemCount={selectedLocationItemCount}
            locations={locations}
            onCreateLocation={handleCreateLocation}
            onCreateLocationFormChange={updateCreateLocationForm}
            onDeleteLocation={handleDeleteLocation}
            onEditLocationFormChange={updateEditLocationForm}
            onSelectLocation={setSelectedLocationId}
            onUpdateLocation={handleUpdateLocation}
            selectedLocation={selectedLocation}
            selectedLocationCharacterCount={selectedLocationCharacterCount}
            selectedLocationId={selectedLocationId}
          />
        );
      case 'powers':
        return (
          <EntityWorkspacePlaceholder
            title="Powers"
            description="Major power structures shape control, balance, and reach across the setting."
            focusAreas={[
              'Nations and world powers',
              'Political blocs and international groupings',
              'Institutions that project influence at scale',
              'Other forces that shape control, balance, or reach',
            ]}
            implementationNote="This workspace is now present in the app structure. Structured power records and editing flows have not been implemented yet."
            scopeNote="Treat power here as political, institutional, or otherwise world-shaping influence rather than only individual abilities."
          />
        );
      case 'events':
        return (
          <EntityWorkspacePlaceholder
            title="Events"
            description="Events connect static world data to history, causality, and story movement."
            focusAreas={[
              'What happened',
              'When it happened',
              'Where it happened',
              'Who was involved',
              'What changed because of it',
            ]}
            implementationNote="This workspace is now represented in navigation and world planning. Event authoring and chronology tools remain future work."
          />
        );
      case 'items':
        return (
          <ItemWorkspace
            characters={characters}
            createItemForm={createItemForm}
            editItemForm={editItemForm}
            filteredItems={filteredItems}
            isCreatingItem={isCreatingItem}
            isDeletingItem={isDeletingItem}
            isLoadingItemDetails={isLoadingItemDetails}
            isLoadingItems={isLoadingItems}
            isUpdatingItem={isUpdatingItem}
            itemAssignmentFilter={itemAssignmentFilter}
            itemSearch={itemSearch}
            items={items}
            locations={locations}
            onCreateItem={handleCreateItem}
            onCreateItemFormChange={updateCreateItemForm}
            onDeleteItem={handleDeleteItem}
            onEditItemFormChange={updateEditItemForm}
            onItemAssignmentFilterChange={setItemAssignmentFilter}
            onItemSearchChange={setItemSearch}
            onSelectItem={setSelectedItemId}
            onUpdateItem={handleUpdateItem}
            selectedItem={selectedItem}
            selectedItemId={selectedItemId}
          />
        );
      case 'organizations':
        return (
          <EntityWorkspacePlaceholder
            title="Organizations"
            description="Organizations cover the in-world structures that operate between individuals and major world powers."
            focusAreas={[
              'Academies, guilds, and orders',
              'Military units and forces',
              'Religions and companies',
              'Local factions and institutions',
            ]}
            implementationNote="This workspace is now present in the app structure. Structured organization records and editing flows have not been implemented yet."
            scopeNote="Use organizations for bounded groups and institutions rather than the large-scale power structures tracked in Powers."
          />
        );
    }
  },
);
