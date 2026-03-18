import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Character, CharacterDetail } from '@shared/character';
import type { Item, ItemDetail } from '@shared/item';
import type { Location, LocationDetail } from '@shared/location';
import type { TemporalDetailStatus } from '@shared/temporal';
import { CharacterWorkspace } from '@renderer/features/characters/CharacterWorkspace';
import { EntityWorkspacePlaceholder } from '@renderer/features/entities/EntityWorkspacePlaceholder';
import { ItemWorkspace } from '@renderer/features/items/ItemWorkspace';
import { LocationWorkspace } from '@renderer/features/locations/LocationWorkspace';
import { WorldOverview } from '@renderer/features/world/WorldOverview';
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
  committedTick: number;
  onErrorChange: (message: string | null) => void;
  onTimelineMetadataRefresh: () => Promise<void>;
  onViewChange: (view: WorkspaceView) => void;
  previewTick: number | null;
};

type OverviewDelta = {
  gaps: number;
  items: number;
  people: number;
  places: number;
};

const emptyOverviewDelta: OverviewDelta = {
  gaps: 0,
  items: 0,
  people: 0,
  places: 0,
};

function buildCharacterForm(record: Character, effectiveTick: number): CharacterFormState {
  return {
    name: record.name,
    summary: record.summary,
    locationId: record.locationId,
    effectiveTick,
  };
}

function buildLocationForm(record: Location, effectiveTick: number): LocationFormState {
  return {
    name: record.name,
    summary: record.summary,
    effectiveTick,
  };
}

function buildItemForm(record: Item, effectiveTick: number): ItemFormState {
  return {
    name: record.name,
    summary: record.summary,
    quantity: record.quantity,
    ownerCharacterId: record.ownerCharacterId,
    locationId: record.locationId,
    effectiveTick,
  };
}

function compareCharacters(left: Character, right: Character): boolean {
  return (
    left.name === right.name &&
    left.summary === right.summary &&
    left.locationId === right.locationId &&
    left.existsFromTick === right.existsFromTick &&
    left.existsToTick === right.existsToTick
  );
}

function compareLocations(left: Location, right: Location): boolean {
  return (
    left.name === right.name &&
    left.summary === right.summary &&
    left.existsFromTick === right.existsFromTick &&
    left.existsToTick === right.existsToTick
  );
}

function compareItems(left: Item, right: Item): boolean {
  return (
    left.name === right.name &&
    left.summary === right.summary &&
    left.quantity === right.quantity &&
    left.ownerCharacterId === right.ownerCharacterId &&
    left.locationId === right.locationId &&
    left.existsFromTick === right.existsFromTick &&
    left.existsToTick === right.existsToTick
  );
}

function diffIds<TRecord extends { id: number }>(
  previousRecords: TRecord[],
  nextRecords: TRecord[],
  isSameRecord: (left: TRecord, right: TRecord) => boolean,
): Set<number> {
  const previousById = new Map(previousRecords.map((record) => [record.id, record]));
  const nextById = new Map(nextRecords.map((record) => [record.id, record]));
  const changedIds = new Set<number>();

  for (const [id, previousRecord] of previousById) {
    const nextRecord = nextById.get(id);

    if (!nextRecord || !isSameRecord(previousRecord, nextRecord)) {
      changedIds.add(id);
    }
  }

  for (const [id, nextRecord] of nextById) {
    const previousRecord = previousById.get(id);

    if (!previousRecord || !isSameRecord(previousRecord, nextRecord)) {
      changedIds.add(id);
    }
  }

  return changedIds;
}

function countCoverageGaps(characters: Character[], items: Item[]): number {
  const unplacedCharacters = characters.filter((character) => character.locationId === null);
  const unassignedItems = items.filter(
    (item) => item.ownerCharacterId === null && item.locationId === null,
  );

  return unplacedCharacters.length + unassignedItems.length;
}

export const WorldWorkshop = forwardRef<WorldWorkshopHandle, WorldWorkshopProps>(
  function WorldWorkshop(
    {
      activeView,
      committedTick,
      onErrorChange,
      onTimelineMetadataRefresh,
      onViewChange,
      previewTick,
    },
    ref,
  ) {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [characterSearch, setCharacterSearch] = useState('');
    const [characterLocationFilter, setCharacterLocationFilter] = useState('all');
    const [itemSearch, setItemSearch] = useState('');
    const [itemAssignmentFilter, setItemAssignmentFilter] = useState('all');
    const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [selectedCharacterStatus, setSelectedCharacterStatus] =
      useState<TemporalDetailStatus>('missing');
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [selectedLocationStatus, setSelectedLocationStatus] =
      useState<TemporalDetailStatus>('missing');
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [selectedItemStatus, setSelectedItemStatus] =
      useState<TemporalDetailStatus>('missing');
    const [createCharacterForm, setCreateCharacterForm] = useState<CharacterFormState>(
      emptyCharacterForm(committedTick),
    );
    const [editCharacterForm, setEditCharacterForm] = useState<CharacterFormState>(
      emptyCharacterForm(committedTick),
    );
    const [createLocationForm, setCreateLocationForm] = useState<LocationFormState>(
      emptyLocationForm(committedTick),
    );
    const [editLocationForm, setEditLocationForm] = useState<LocationFormState>(
      emptyLocationForm(committedTick),
    );
    const [createItemForm, setCreateItemForm] = useState<ItemFormState>(
      emptyItemForm(committedTick),
    );
    const [editItemForm, setEditItemForm] = useState<ItemFormState>(
      emptyItemForm(committedTick),
    );
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
    const [changedCharacterIds, setChangedCharacterIds] = useState<Set<number>>(new Set());
    const [changedLocationIds, setChangedLocationIds] = useState<Set<number>>(new Set());
    const [changedItemIds, setChangedItemIds] = useState<Set<number>>(new Set());
    const [overviewDelta, setOverviewDelta] = useState<OverviewDelta>(emptyOverviewDelta);

    const charactersRef = useRef<Character[]>([]);
    const locationsRef = useRef<Location[]>([]);
    const itemsRef = useRef<Item[]>([]);
    const loadRequestIdRef = useRef(0);

    useEffect(() => {
      setCreateCharacterForm((current) => ({ ...current, effectiveTick: committedTick }));
      setEditCharacterForm((current) => ({ ...current, effectiveTick: committedTick }));
      setCreateLocationForm((current) => ({ ...current, effectiveTick: committedTick }));
      setEditLocationForm((current) => ({ ...current, effectiveTick: committedTick }));
      setCreateItemForm((current) => ({ ...current, effectiveTick: committedTick }));
      setEditItemForm((current) => ({ ...current, effectiveTick: committedTick }));
    }, [committedTick]);

    useEffect(() => {
      if (previewTick === null) {
        void loadSlice({
          tick: committedTick,
          mode: 'commit',
        });
        return;
      }

      const timeoutId = window.setTimeout(() => {
        void loadSlice({
          tick: previewTick,
          mode: 'preview',
        });
      }, 70);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }, [
      activeView,
      committedTick,
      previewTick,
      selectedCharacterId,
      selectedLocationId,
      selectedItemId,
    ]);

    useImperativeHandle(ref, () => ({
      refreshAll: () =>
        loadSlice({
          tick: committedTick,
          mode: 'commit',
          loadAllCoreLists: true,
        }),
    }));

    function clearError(): void {
      onErrorChange(null);
    }

    function reportError(error: unknown): void {
      onErrorChange(getErrorMessage(error));
    }

    function applyCharacterDetail(detail: CharacterDetail, effectiveTick: number): void {
      setSelectedCharacterStatus(detail.status);
      setSelectedCharacter(detail.record);
      setEditCharacterForm(
        detail.record ? buildCharacterForm(detail.record, effectiveTick) : emptyCharacterForm(effectiveTick),
      );
    }

    function applyLocationDetail(detail: LocationDetail, effectiveTick: number): void {
      setSelectedLocationStatus(detail.status);
      setSelectedLocation(detail.record);
      setEditLocationForm(
        detail.record ? buildLocationForm(detail.record, effectiveTick) : emptyLocationForm(effectiveTick),
      );
    }

    function applyItemDetail(detail: ItemDetail, effectiveTick: number): void {
      setSelectedItemStatus(detail.status);
      setSelectedItem(detail.record);
      setEditItemForm(
        detail.record ? buildItemForm(detail.record, effectiveTick) : emptyItemForm(effectiveTick),
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

    async function loadSlice(input: {
      tick: number;
      mode: 'preview' | 'commit';
      loadAllCoreLists?: boolean;
      preferredCharacterId?: number | null;
      preferredItemId?: number | null;
      preferredLocationId?: number | null;
    }): Promise<void> {
      const requestId = ++loadRequestIdRef.current;
      const shouldLoadAllCoreLists = input.loadAllCoreLists ?? activeView === 'overview';
      const needsCharacters =
        shouldLoadAllCoreLists || activeView === 'people' || activeView === 'items' || activeView === 'places';
      const needsLocations =
        shouldLoadAllCoreLists || activeView === 'people' || activeView === 'items' || activeView === 'places';
      const needsItems =
        shouldLoadAllCoreLists || activeView === 'items' || activeView === 'places';
      const nextCharacterId = input.preferredCharacterId ?? selectedCharacterId;
      const nextLocationId = input.preferredLocationId ?? selectedLocationId;
      const nextItemId = input.preferredItemId ?? selectedItemId;

      if (needsCharacters) {
        setIsLoadingCharacters(true);
      }

      if (needsLocations) {
        setIsLoadingLocations(true);
      }

      if (needsItems) {
        setIsLoadingItems(true);
      }

      if (activeView === 'people' && nextCharacterId !== null) {
        setIsLoadingCharacterDetails(true);
      }

      if (activeView === 'places' && nextLocationId !== null) {
        setIsLoadingLocationDetails(true);
      }

      if (activeView === 'items' && nextItemId !== null) {
        setIsLoadingItemDetails(true);
      }

      clearError();

      try {
        const previousCharacters = charactersRef.current;
        const previousLocations = locationsRef.current;
        const previousItems = itemsRef.current;
        const [
          nextCharacters,
          nextLocations,
          nextItems,
          nextCharacterDetail,
          nextLocationDetail,
          nextItemDetail,
        ] = await Promise.all([
          needsCharacters
            ? window.worldForge.listCharacters({ asOfTick: input.tick })
            : Promise.resolve(null),
          needsLocations
            ? window.worldForge.listLocations({ asOfTick: input.tick })
            : Promise.resolve(null),
          needsItems
            ? window.worldForge.listItems({ asOfTick: input.tick })
            : Promise.resolve(null),
          activeView === 'people' && nextCharacterId !== null
            ? window.worldForge.getCharacter({
                id: nextCharacterId,
                asOfTick: input.tick,
              })
            : Promise.resolve(null),
          activeView === 'places' && nextLocationId !== null
            ? window.worldForge.getLocation({
                id: nextLocationId,
                asOfTick: input.tick,
              })
            : Promise.resolve(null),
          activeView === 'items' && nextItemId !== null
            ? window.worldForge.getItem({
                id: nextItemId,
                asOfTick: input.tick,
              })
            : Promise.resolve(null),
        ]);

        if (requestId !== loadRequestIdRef.current) {
          return;
        }

        if (nextCharacters) {
          if (input.mode === 'commit') {
            setChangedCharacterIds(
              diffIds(previousCharacters, nextCharacters, compareCharacters),
            );
          }

          charactersRef.current = nextCharacters;
          setCharacters(nextCharacters);
        }

        if (nextLocations) {
          if (input.mode === 'commit') {
            setChangedLocationIds(
              diffIds(previousLocations, nextLocations, compareLocations),
            );
          }

          locationsRef.current = nextLocations;
          setLocations(nextLocations);
        }

        if (nextItems) {
          if (input.mode === 'commit') {
            setChangedItemIds(diffIds(previousItems, nextItems, compareItems));
          }

          itemsRef.current = nextItems;
          setItems(nextItems);
        }

        if (input.mode === 'commit' && nextCharacters && nextLocations && nextItems) {
          setOverviewDelta({
            people: nextCharacters.length - previousCharacters.length,
            places: nextLocations.length - previousLocations.length,
            items: nextItems.length - previousItems.length,
            gaps:
              countCoverageGaps(nextCharacters, nextItems) -
              countCoverageGaps(previousCharacters, previousItems),
          });
        }

        if (nextCharacterDetail) {
          applyCharacterDetail(nextCharacterDetail, committedTick);
        } else if (activeView === 'people' && nextCharacterId === null) {
          applyCharacterDetail({ status: 'missing', record: null }, committedTick);
        }

        if (nextLocationDetail) {
          applyLocationDetail(nextLocationDetail, committedTick);
        } else if (activeView === 'places' && nextLocationId === null) {
          applyLocationDetail({ status: 'missing', record: null }, committedTick);
        }

        if (nextItemDetail) {
          applyItemDetail(nextItemDetail, committedTick);
        } else if (activeView === 'items' && nextItemId === null) {
          applyItemDetail({ status: 'missing', record: null }, committedTick);
        }

        if (input.mode === 'commit') {
          if (nextCharacters && nextCharacters.length > 0 && nextCharacterId === null) {
            setSelectedCharacterId(nextCharacters[0]?.id ?? null);
          }

          if (nextLocations && nextLocations.length > 0 && nextLocationId === null) {
            setSelectedLocationId(nextLocations[0]?.id ?? null);
          }

          if (nextItems && nextItems.length > 0 && nextItemId === null) {
            setSelectedItemId(nextItems[0]?.id ?? null);
          }
        }
      } catch (error) {
        if (requestId === loadRequestIdRef.current) {
          reportError(error);
        }
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setIsLoadingCharacters(false);
          setIsLoadingCharacterDetails(false);
          setIsLoadingLocations(false);
          setIsLoadingLocationDetails(false);
          setIsLoadingItems(false);
          setIsLoadingItemDetails(false);
        }
      }
    }

    async function handleCreateCharacter(
      event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
      event.preventDefault();
      setIsCreatingCharacter(true);
      clearError();

      try {
        const created = await window.worldForge.createCharacter(createCharacterForm);
        setSelectedCharacterId(created.id);
        setCreateCharacterForm(emptyCharacterForm(committedTick));
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredCharacterId: created.id,
        });
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
        await window.worldForge.updateCharacter({
          id: selectedCharacterId,
          ...editCharacterForm,
        });
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredCharacterId: selectedCharacterId,
        });
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

      if (!window.confirm('End this person at the selected effective tick?')) {
        return;
      }

      setIsDeletingCharacter(true);
      clearError();

      try {
        await window.worldForge.deleteCharacter({
          id: selectedCharacterId,
          effectiveTick: committedTick,
        });
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredCharacterId: selectedCharacterId,
        });
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
        setSelectedLocationId(created.id);
        setCreateLocationForm(emptyLocationForm(committedTick));
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredLocationId: created.id,
        });
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
        await window.worldForge.updateLocation({
          id: selectedLocationId,
          ...editLocationForm,
        });
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredLocationId: selectedLocationId,
        });
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

      if (!window.confirm('End this place at the selected effective tick?')) {
        return;
      }

      setIsDeletingLocation(true);
      clearError();

      try {
        await window.worldForge.deleteLocation({
          id: selectedLocationId,
          effectiveTick: committedTick,
        });
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredLocationId: selectedLocationId,
        });
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
        setSelectedItemId(created.id);
        setCreateItemForm(emptyItemForm(committedTick));
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredItemId: created.id,
        });
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
        await window.worldForge.updateItem({
          id: selectedItemId,
          ...editItemForm,
        });
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredItemId: selectedItemId,
        });
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

      if (!window.confirm('End this item at the selected effective tick?')) {
        return;
      }

      setIsDeletingItem(true);
      clearError();

      try {
        await window.worldForge.deleteItem({
          id: selectedItemId,
          effectiveTick: committedTick,
        });
        await onTimelineMetadataRefresh();
        await loadSlice({
          tick: committedTick,
          mode: 'commit',
          preferredItemId: selectedItemId,
        });
      } catch (error) {
        reportError(error);
      } finally {
        setIsDeletingItem(false);
      }
    }

    const filteredCharacters = characters.filter((character) => {
      const matchesSearch =
        character.name.toLowerCase().includes(characterSearch.toLowerCase()) ||
        character.summary.toLowerCase().includes(characterSearch.toLowerCase()) ||
        character.location?.name.toLowerCase().includes(characterSearch.toLowerCase());
      const matchesLocationFilter =
        characterLocationFilter === 'all'
          ? true
          : characterLocationFilter === 'unassigned'
            ? character.locationId === null
            : String(character.locationId) === characterLocationFilter;

      return matchesSearch && matchesLocationFilter;
    });

    const filteredItems = items.filter((item) => {
      const assignmentSummary =
        item.ownerCharacter?.name ?? item.location?.name ?? 'Unassigned';
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

    const selectedLocationCharacterCount = selectedLocation
      ? characters.filter((character) => character.locationId === selectedLocation.id).length
      : 0;
    const selectedLocationItemCount = selectedLocation
      ? items.filter((item) => item.locationId === selectedLocation.id).length
      : 0;

    switch (activeView) {
      case 'overview':
        return (
          <WorldOverview
            changedCharacterIds={changedCharacterIds}
            changedItemIds={changedItemIds}
            changedLocationIds={changedLocationIds}
            characters={characters}
            isLoading={isLoadingCharacters || isLoadingLocations || isLoadingItems}
            items={items}
            locations={locations}
            onViewChange={onViewChange}
            overviewDelta={overviewDelta}
            tick={previewTick ?? committedTick}
          />
        );
      case 'people':
        return (
          <CharacterWorkspace
            characterLocationFilter={characterLocationFilter}
            characterSearch={characterSearch}
            changedCharacterIds={changedCharacterIds}
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
            selectedCharacterStatus={selectedCharacterStatus}
            tick={previewTick ?? committedTick}
          />
        );
      case 'places':
        return (
          <LocationWorkspace
            changedLocationIds={changedLocationIds}
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
            selectedLocationStatus={selectedLocationStatus}
            tick={previewTick ?? committedTick}
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
            changedItemIds={changedItemIds}
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
            selectedItemStatus={selectedItemStatus}
            tick={previewTick ?? committedTick}
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
