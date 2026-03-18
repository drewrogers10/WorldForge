import type { FormEvent } from 'react';
import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import type { TemporalDetailStatus } from '@shared/temporal';
import type { CharacterFormState } from '@renderer/lib/forms';
import { CharacterEditor } from './CharacterEditor';
import { CharacterList } from './CharacterList';

type CharacterWorkspaceProps = {
  characterLocationFilter: string;
  characterSearch: string;
  changedCharacterIds: ReadonlySet<number>;
  characters: Character[];
  createCharacterForm: CharacterFormState;
  editCharacterForm: CharacterFormState;
  filteredCharacters: Character[];
  isCreatingCharacter: boolean;
  isDeletingCharacter: boolean;
  isLoadingCharacterDetails: boolean;
  isLoadingCharacters: boolean;
  isUpdatingCharacter: boolean;
  locations: Location[];
  onCharacterLocationFilterChange: (value: string) => void;
  onCharacterSearchChange: (value: string) => void;
  onCreateCharacter: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCreateCharacterFormChange: (changes: Partial<CharacterFormState>) => void;
  onDeleteCharacter: () => void | Promise<void>;
  onEditCharacterFormChange: (changes: Partial<CharacterFormState>) => void;
  onSelectCharacter: (id: number) => void;
  onUpdateCharacter: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  selectedCharacter: Character | null;
  selectedCharacterId: number | null;
  selectedCharacterStatus: TemporalDetailStatus;
  tick: number;
};

export function CharacterWorkspace({
  characterLocationFilter,
  characterSearch,
  changedCharacterIds,
  characters,
  createCharacterForm,
  editCharacterForm,
  filteredCharacters,
  isCreatingCharacter,
  isDeletingCharacter,
  isLoadingCharacterDetails,
  isLoadingCharacters,
  isUpdatingCharacter,
  locations,
  onCharacterLocationFilterChange,
  onCharacterSearchChange,
  onCreateCharacter,
  onCreateCharacterFormChange,
  onDeleteCharacter,
  onEditCharacterFormChange,
  onSelectCharacter,
  onUpdateCharacter,
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
        form={editCharacterForm}
        isDeleting={isDeletingCharacter}
        isLoading={isLoadingCharacterDetails}
        isSubmitting={isUpdatingCharacter}
        locations={locations}
        mode="edit"
        onDelete={onDeleteCharacter}
        onFormChange={onEditCharacterFormChange}
        onSubmit={onUpdateCharacter}
        selectedCharacterId={selectedCharacterId}
        selectedCharacterStatus={selectedCharacterStatus}
        tick={tick}
      />

      <CharacterEditor
        character={null}
        form={createCharacterForm}
        isSubmitting={isCreatingCharacter}
        locations={locations}
        mode="create"
        onFormChange={onCreateCharacterFormChange}
        onSubmit={onCreateCharacter}
        selectedCharacterId={selectedCharacterId}
        selectedCharacterStatus="active"
        tick={tick}
      />
    </main>
  );
}
