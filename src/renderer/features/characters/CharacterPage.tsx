import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Character } from '@shared/character';
import type { TemporalDetailStatus } from '@shared/temporal';
import { useTopBarControls } from '@renderer/components/TopBarControls';
import {
  areFormStatesEqual,
  emptyCharacterForm,
  getErrorMessage,
  type CharacterFormState,
} from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';
import { useEntityStore } from '@renderer/store/entityStore';
import { useSidebarStore } from '@renderer/store/sidebarStore';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';
import { useWorldStore } from '@renderer/store/worldStore';
import { CharacterWorkspace } from './CharacterWorkspace';

function toCharacterForm(character: Character, effectiveTick: number): CharacterFormState {
  return {
    name: character.name,
    summary: character.summary,
    locationId: character.locationId,
    effectiveTick,
  };
}

function getDiscardMessage(mode: WorkspaceMode): string {
  return mode === 'create'
    ? 'Discard this new person draft?'
    : 'Discard unsaved changes to this person?';
}

export function CharacterPage() {
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { characters, locations, isLoading, loadWorldData } = useWorldStore();
  const { selectedCharacterId, setSelectedCharacterId } = useEntityStore();
  const loadSidebarData = useSidebarStore((state) => state.loadSidebarData);
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [mode, setMode] = useState<WorkspaceMode>('browse');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedCharacterStatus, setSelectedCharacterStatus] =
    useState<TemporalDetailStatus>('missing');
  const [characterSearch, setCharacterSearch] = useState('');
  const [characterLocationFilter, setCharacterLocationFilter] = useState('all');
  const [createCharacterForm, setCreateCharacterForm] = useState<CharacterFormState>(
    emptyCharacterForm(committedTick),
  );
  const [editCharacterForm, setEditCharacterForm] = useState<CharacterFormState>(
    emptyCharacterForm(committedTick),
  );
  const [isLoadingCharacterDetails, setIsLoadingCharacterDetails] = useState(false);
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [isUpdatingCharacter, setIsUpdatingCharacter] = useState(false);
  const [isDeletingCharacter, setIsDeletingCharacter] = useState(false);

  const reloadCharacterDetail = useCallback(
    async (characterId: number, asOfTick: number, effectiveTick: number) => {
      const detail = await window.worldForge.getCharacter({
        id: characterId,
        asOfTick,
      });

      setSelectedCharacterStatus(detail.status);
      setSelectedCharacter(detail.record);
      setEditCharacterForm(
        detail.record ? toCharacterForm(detail.record, effectiveTick) : emptyCharacterForm(effectiveTick),
      );
    },
    [],
  );

  useEffect(() => {
    setCreateCharacterForm((current) => ({ ...current, effectiveTick: committedTick }));
    setEditCharacterForm((current) => ({ ...current, effectiveTick: committedTick }));
  }, [committedTick]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadWorldData(tick);
    }, 50);

    return () => clearTimeout(timeout);
  }, [loadWorldData, tick]);

  useEffect(() => {
    async function loadDetails() {
      if (selectedCharacterId === null) {
        setSelectedCharacter(null);
        setSelectedCharacterStatus('missing');
        return;
      }

      setIsLoadingCharacterDetails(true);
      setErrorMessage(null);

      try {
        await reloadCharacterDetail(selectedCharacterId, tick, committedTick);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoadingCharacterDetails(false);
      }
    }

    const timeout = setTimeout(() => {
      void loadDetails();
    }, 50);

    return () => clearTimeout(timeout);
  }, [committedTick, reloadCharacterDetail, selectedCharacterId, setErrorMessage, tick]);

  const createBaseline = useMemo(() => emptyCharacterForm(committedTick), [committedTick]);
  const editBaseline = useMemo(
    () =>
      selectedCharacter
        ? toCharacterForm(selectedCharacter, committedTick)
        : emptyCharacterForm(committedTick),
    [committedTick, selectedCharacter],
  );
  const isDirty =
    mode === 'create'
      ? !areFormStatesEqual(createCharacterForm, createBaseline)
      : mode === 'edit'
        ? !areFormStatesEqual(editCharacterForm, editBaseline)
        : false;
  const isSavingCharacter = isCreatingCharacter || isUpdatingCharacter || isDeletingCharacter;
  const activeForm = mode === 'create' ? createCharacterForm : editCharacterForm;

  const confirmCharacterNavigation = useCallback(() => {
    if (!isDirty) {
      return true;
    }

    return window.confirm(getDiscardMessage(mode));
  }, [isDirty, mode]);

  const handleSelectCharacter = useCallback(
    (id: number) => {
      if (id === selectedCharacterId) {
        return;
      }

      if (!confirmCharacterNavigation()) {
        return;
      }

      setSelectedCharacterId(id);
      setMode('browse');
    },
    [confirmCharacterNavigation, selectedCharacterId, setSelectedCharacterId],
  );

  const handleStartCreate = useCallback(() => {
    if (!confirmCharacterNavigation()) {
      return;
    }

    setCreateCharacterForm(emptyCharacterForm(committedTick));
    setMode('create');
  }, [committedTick, confirmCharacterNavigation]);

  const handleStartEdit = useCallback(() => {
    if (selectedCharacterId === null || selectedCharacterStatus !== 'active' || !selectedCharacter) {
      return;
    }

    if (!confirmCharacterNavigation()) {
      return;
    }

    setEditCharacterForm(toCharacterForm(selectedCharacter, committedTick));
    setMode('edit');
  }, [
    committedTick,
    confirmCharacterNavigation,
    selectedCharacter,
    selectedCharacterId,
    selectedCharacterStatus,
  ]);

  const handleCancelMode = useCallback(() => {
    if (mode === 'create') {
      setCreateCharacterForm(emptyCharacterForm(committedTick));
    } else if (mode === 'edit') {
      setEditCharacterForm(editBaseline);
    }

    setMode('browse');
  }, [committedTick, editBaseline, mode]);

  const handleCreateCharacter = useCallback(async () => {
    setIsCreatingCharacter(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createCharacter(createCharacterForm);
      setSelectedCharacterId(created.id);
      setCreateCharacterForm(emptyCharacterForm(committedTick));

      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
        reloadCharacterDetail(created.id, tick, committedTick),
      ]);

      setMode('edit');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingCharacter(false);
    }
  }, [
    committedTick,
    createCharacterForm,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadCharacterDetail,
    setErrorMessage,
    setSelectedCharacterId,
    tick,
  ]);

  const handleUpdateCharacter = useCallback(async () => {
    if (selectedCharacterId === null) {
      return;
    }

    setIsUpdatingCharacter(true);
    setErrorMessage(null);

    try {
      await window.worldForge.updateCharacter({
        id: selectedCharacterId,
        ...editCharacterForm,
      });

      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
        reloadCharacterDetail(selectedCharacterId, tick, committedTick),
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdatingCharacter(false);
    }
  }, [
    committedTick,
    editCharacterForm,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadCharacterDetail,
    selectedCharacterId,
    setErrorMessage,
    tick,
  ]);

  const handleDeleteCharacter = useCallback(async () => {
    if (selectedCharacterId === null || isDeletingCharacter) {
      return;
    }

    if (!window.confirm('End this person at the selected effective time?')) {
      return;
    }

    setIsDeletingCharacter(true);
    setErrorMessage(null);

    try {
      await window.worldForge.deleteCharacter({
        id: selectedCharacterId,
        effectiveTick: committedTick,
      });

      await refreshTimeline();
      await Promise.all([
        loadWorldData(committedTick),
        loadSidebarData(committedTick),
        reloadCharacterDetail(selectedCharacterId, tick, committedTick),
      ]);

      setMode('browse');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDeletingCharacter(false);
    }
  }, [
    committedTick,
    isDeletingCharacter,
    loadSidebarData,
    loadWorldData,
    refreshTimeline,
    reloadCharacterDetail,
    selectedCharacterId,
    setErrorMessage,
    tick,
  ]);

  const handleSaveCharacter = useCallback(async () => {
    if (mode === 'create') {
      await handleCreateCharacter();
      return;
    }

    if (mode === 'edit') {
      await handleUpdateCharacter();
    }
  }, [handleCreateCharacter, handleUpdateCharacter, mode]);

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

  const canEditCharacter =
    selectedCharacterId !== null &&
    selectedCharacterStatus === 'active' &&
    !isLoadingCharacterDetails;
  const canSaveCharacter =
    mode === 'create'
      ? createCharacterForm.name.trim().length > 0
      : mode === 'edit'
        ? selectedCharacterId !== null && editCharacterForm.name.trim().length > 0
        : false;

  const topBarConfig = useMemo(
    () => ({
      actions: [
        {
          id: 'add-character',
          label: 'Add',
          onSelect: handleStartCreate,
          variant: 'primary' as const,
          visible: mode === 'browse',
        },
        {
          id: 'edit-character',
          label: 'Edit',
          onSelect: handleStartEdit,
          variant: 'secondary' as const,
          disabled: !canEditCharacter,
          visible: mode === 'browse',
        },
        {
          id: 'save-character',
          label: isCreatingCharacter ? 'Creating...' : isUpdatingCharacter ? 'Saving...' : 'Save',
          onSelect: handleSaveCharacter,
          variant: 'primary' as const,
          disabled: !canSaveCharacter || isSavingCharacter,
          visible: mode !== 'browse',
        },
        {
          id: 'cancel-character',
          label: 'Cancel',
          onSelect: handleCancelMode,
          variant: 'secondary' as const,
          disabled: isSavingCharacter,
          visible: mode !== 'browse',
        },
        {
          id: 'end-character',
          label: isDeletingCharacter ? 'Ending...' : 'End',
          onSelect: handleDeleteCharacter,
          variant: 'danger' as const,
          disabled: !canEditCharacter || isSavingCharacter,
          visible: mode === 'edit',
        },
      ],
      confirmNavigation: confirmCharacterNavigation,
      isBusy: isLoadingCharacterDetails || isSavingCharacter,
      modeLabel:
        mode === 'create'
          ? 'Creating Person'
          : mode === 'edit'
            ? 'Editing Person'
            : 'Browsing People',
      ...(selectedCharacter
        ? { selectionLabel: `Person: ${selectedCharacter.name}` }
        : selectedCharacterId === null
          ? { selectionLabel: 'No person selected' }
          : {}),
    }),
    [
      canEditCharacter,
      canSaveCharacter,
      confirmCharacterNavigation,
      handleCancelMode,
      handleDeleteCharacter,
      handleSaveCharacter,
      handleStartCreate,
      handleStartEdit,
      isCreatingCharacter,
      isDeletingCharacter,
      isLoadingCharacterDetails,
      isSavingCharacter,
      isUpdatingCharacter,
      mode,
      selectedCharacter,
      selectedCharacterId,
    ],
  );

  useTopBarControls(topBarConfig);

  return (
    <CharacterWorkspace
      activeForm={activeForm}
      characterLocationFilter={characterLocationFilter}
      characterSearch={characterSearch}
      changedCharacterIds={new Set()}
      characters={characters}
      filteredCharacters={filteredCharacters}
      isLoadingCharacterDetails={isLoadingCharacterDetails}
      isLoadingCharacters={isLoading}
      isSavingCharacter={isSavingCharacter}
      locations={locations}
      mode={mode}
      onCharacterLocationFilterChange={setCharacterLocationFilter}
      onCharacterSearchChange={setCharacterSearch}
      onFormChange={(changes) => {
        if (mode === 'create') {
          setCreateCharacterForm((current) => ({ ...current, ...changes }));
          return;
        }

        setEditCharacterForm((current) => ({ ...current, ...changes }));
      }}
      onSelectCharacter={handleSelectCharacter}
      onSubmit={handleSaveCharacter}
      selectedCharacter={selectedCharacter}
      selectedCharacterId={selectedCharacterId}
      selectedCharacterStatus={selectedCharacterStatus}
      tick={tick}
    />
  );
}
