import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import type { TemporalDetailStatus } from '@shared/temporal';
import type { CharacterFormState } from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';
import { CharacterEditor } from './CharacterEditor';
import { CharacterList } from './CharacterList';

type CharacterWorkspaceProps = {
  activeForm: CharacterFormState;
  characterLocationFilter: string;
  characterSearch: string;
  changedCharacterIds: ReadonlySet<number>;
  characters: Character[];
  filteredCharacters: Character[];
  isLoadingCharacterDetails: boolean;
  isLoadingCharacters: boolean;
  isSavingCharacter: boolean;
  locations: Location[];
  mode: WorkspaceMode;
  onCharacterLocationFilterChange: (value: string) => void;
  onCharacterSearchChange: (value: string) => void;
  onFormChange: (changes: Partial<CharacterFormState>) => void;
  onSelectCharacter: (id: number) => void;
  onSubmit: () => void | Promise<void>;
  selectedCharacter: Character | null;
  selectedCharacterId: number | null;
  selectedCharacterStatus: TemporalDetailStatus;
  tick: number;
};

export function CharacterWorkspace({
  activeForm,
  characterLocationFilter,
  characterSearch,
  changedCharacterIds,
  characters,
  filteredCharacters,
  isLoadingCharacterDetails,
  isLoadingCharacters,
  isSavingCharacter,
  locations,
  mode,
  onCharacterLocationFilterChange,
  onCharacterSearchChange,
  onFormChange,
  onSelectCharacter,
  onSubmit,
  selectedCharacter,
  selectedCharacterId,
  selectedCharacterStatus,
  tick,
}: CharacterWorkspaceProps) {
  return (
    <main className="content-grid">
      <CharacterList
        characterLocationFilter={characterLocationFilter}
        characterSearch={characterSearch}
        changedCharacterIds={changedCharacterIds}
        characters={characters}
        filteredCharacters={filteredCharacters}
        isLoading={isLoadingCharacters}
        locations={locations}
        onCharacterLocationFilterChange={onCharacterLocationFilterChange}
        onCharacterSearchChange={onCharacterSearchChange}
        onSelectCharacter={onSelectCharacter}
        selectedCharacterId={selectedCharacterId}
      />

      <CharacterEditor
        character={selectedCharacter}
        form={activeForm}
        isLoading={isLoadingCharacterDetails}
        isSubmitting={isSavingCharacter}
        locations={locations}
        mode={mode}
        onFormChange={onFormChange}
        onSubmit={onSubmit}
        selectedCharacterId={selectedCharacterId}
        selectedCharacterStatus={selectedCharacterStatus}
        tick={tick}
      />
    </main>
  );
}
