import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import { Panel } from '@renderer/components/Panel';

type CharacterListProps = {
  characterLocationFilter: string;
  characterSearch: string;
  characters: Character[];
  filteredCharacters: Character[];
  isLoading: boolean;
  locations: Location[];
  onCharacterLocationFilterChange: (value: string) => void;
  onCharacterSearchChange: (value: string) => void;
  onSelectCharacter: (id: number) => void;
  selectedCharacterId: number | null;
};

export function CharacterList({
  characterLocationFilter,
  characterSearch,
  characters,
  filteredCharacters,
  isLoading,
  locations,
  onCharacterLocationFilterChange,
  onCharacterSearchChange,
  onSelectCharacter,
  selectedCharacterId,
}: CharacterListProps) {
  return (
    <Panel
      badge={
        <span className="pill">
          {filteredCharacters.length}/{characters.length}
        </span>
      }
      title="People"
    >
      <div className="list-controls">
        <label>
          <span>Search</span>
          <input
            onChange={(event) => {
              onCharacterSearchChange(event.target.value);
            }}
            placeholder="Search name, summary, or place"
            value={characterSearch}
          />
        </label>

        <label>
          <span>Filter by place</span>
          <select
            onChange={(event) => {
              onCharacterLocationFilterChange(event.target.value);
            }}
            value={characterLocationFilter}
          >
            <option value="all">All people</option>
            <option value="unassigned">Unassigned only</option>
            {locations.map((location) => (
              <option key={location.id} value={String(location.id)}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? <p className="muted">Loading people...</p> : null}

      {!isLoading && characters.length === 0 ? (
        <p className="muted">No people yet. Create the first one below.</p>
      ) : null}

      {!isLoading && characters.length > 0 && filteredCharacters.length === 0 ? (
        <p className="muted">No people match the current search or filter.</p>
      ) : null}

      <ul className="entity-list">
        {filteredCharacters.map((character) => (
          <li key={character.id}>
            <button
              className={
                character.id === selectedCharacterId
                  ? 'entity-list-item active'
                  : 'entity-list-item'
              }
              onClick={() => {
                onSelectCharacter(character.id);
              }}
              type="button"
            >
              <div className="entity-list-heading">
                <strong>{character.name}</strong>
                <span className={character.location ? 'pill small' : 'pill subtle'}>
                  {character.location?.name ?? 'Unassigned'}
                </span>
              </div>
              <span>{character.summary || 'No summary yet.'}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
