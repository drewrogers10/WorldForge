import { useEffect, useState, type FormEvent } from 'react';
import { CharacterWorkspace } from './CharacterWorkspace';
import { emptyCharacterForm, getErrorMessage, type CharacterFormState } from '@renderer/lib/forms';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useWorldStore } from '@renderer/store/worldStore';
import { useEntityStore } from '@renderer/store/entityStore';
import { useUiStore } from '@renderer/store/uiStore';
import type { TemporalDetailStatus } from '@shared/temporal';
import type { Character } from '@shared/character';

export function CharacterPage() {
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { characters, locations, isLoading, loadWorldData } = useWorldStore();
  const { selectedCharacterId, setSelectedCharacterId } = useEntityStore();
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedCharacterStatus, setSelectedCharacterStatus] = useState<TemporalDetailStatus>('missing');
  const [characterSearch, setCharacterSearch] = useState('');
  const [characterLocationFilter, setCharacterLocationFilter] = useState('all');

  const [createCharacterForm, setCreateCharacterForm] = useState<CharacterFormState>(emptyCharacterForm(committedTick));
  const [editCharacterForm, setEditCharacterForm] = useState<CharacterFormState>(emptyCharacterForm(committedTick));

  const [isLoadingCharacterDetails, setIsLoadingCharacterDetails] = useState(false);
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [isUpdatingCharacter, setIsUpdatingCharacter] = useState(false);
  const [isDeletingCharacter, setIsDeletingCharacter] = useState(false);

  useEffect(() => {
    setCreateCharacterForm((current) => ({ ...current, effectiveTick: committedTick }));
    setEditCharacterForm((current) => ({ ...current, effectiveTick: committedTick }));
  }, [committedTick]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadWorldData(tick);
    }, 50);
    return () => clearTimeout(timeout);
  }, [tick, loadWorldData]);

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
        const detail = await window.worldForge.getCharacter({ id: selectedCharacterId, asOfTick: tick });
        if (detail) {
          setSelectedCharacterStatus(detail.status);
          setSelectedCharacter(detail.record);
          setEditCharacterForm(detail.record ? {
            name: detail.record.name,
            summary: detail.record.summary,
            locationId: detail.record.locationId,
            effectiveTick: committedTick
          } : emptyCharacterForm(committedTick));
        }
      } catch (e) {
        setErrorMessage(getErrorMessage(e));
      } finally {
        setIsLoadingCharacterDetails(false);
      }
    }
    const timeout = setTimeout(() => { void loadDetails(); }, 50);
    return () => clearTimeout(timeout);
  }, [tick, selectedCharacterId, committedTick, setErrorMessage]);

  async function handleCreateCharacter(e: FormEvent) {
    e.preventDefault();
    setIsCreatingCharacter(true);
    setErrorMessage(null);
    try {
      const created = await window.worldForge.createCharacter(createCharacterForm);
      setSelectedCharacterId(created.id);
      setCreateCharacterForm(emptyCharacterForm(committedTick));
      await refreshTimeline();
      await loadWorldData(committedTick);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsCreatingCharacter(false); }
  }

  async function handleUpdateCharacter(e: FormEvent) {
    e.preventDefault();
    if (selectedCharacterId === null) return;
    setIsUpdatingCharacter(true);
    setErrorMessage(null);
    try {
      await window.worldForge.updateCharacter({ id: selectedCharacterId, ...editCharacterForm });
      await refreshTimeline();
      await loadWorldData(committedTick);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsUpdatingCharacter(false); }
  }

  async function handleDeleteCharacter() {
    if (selectedCharacterId === null || isDeletingCharacter) return;
    if (!window.confirm('End this person at the selected effective tick?')) return;
    setIsDeletingCharacter(true);
    setErrorMessage(null);
    try {
      await window.worldForge.deleteCharacter({ id: selectedCharacterId, effectiveTick: committedTick });
      await refreshTimeline();
      await loadWorldData(committedTick);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } 
    finally { setIsDeletingCharacter(false); }
  }

  const filteredCharacters = characters.filter((character) => {
    const matchesSearch =
      character.name.toLowerCase().includes(characterSearch.toLowerCase()) ||
      character.summary.toLowerCase().includes(characterSearch.toLowerCase()) ||
      character.location?.name.toLowerCase().includes(characterSearch.toLowerCase());
    const matchesLocationFilter =
      characterLocationFilter === 'all' ? true :
      characterLocationFilter === 'unassigned' ? character.locationId === null :
      String(character.locationId) === characterLocationFilter;
    return matchesSearch && matchesLocationFilter;
  });

  return (
    <CharacterWorkspace
        characterLocationFilter={characterLocationFilter}
        characterSearch={characterSearch}
        changedCharacterIds={new Set()}
        characters={characters}
        createCharacterForm={createCharacterForm}
        editCharacterForm={editCharacterForm}
        filteredCharacters={filteredCharacters}
        isCreatingCharacter={isCreatingCharacter}
        isDeletingCharacter={isDeletingCharacter}
        isLoadingCharacterDetails={isLoadingCharacterDetails}
        isLoadingCharacters={isLoading}
        isUpdatingCharacter={isUpdatingCharacter}
        locations={locations}
        onCharacterLocationFilterChange={setCharacterLocationFilter}
        onCharacterSearchChange={setCharacterSearch}
        onCreateCharacter={handleCreateCharacter}
        onCreateCharacterFormChange={(changes) => setCreateCharacterForm((curr) => ({ ...curr, ...changes }))}
        onDeleteCharacter={handleDeleteCharacter}
        onEditCharacterFormChange={(changes) => setEditCharacterForm((curr) => ({ ...curr, ...changes }))}
        onSelectCharacter={setSelectedCharacterId}
        onUpdateCharacter={handleUpdateCharacter}
        selectedCharacter={selectedCharacter}
        selectedCharacterId={selectedCharacterId}
        selectedCharacterStatus={selectedCharacterStatus}
        tick={tick}
    />
  );
}
