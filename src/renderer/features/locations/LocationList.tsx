import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import { Panel } from '@renderer/components/Panel';

type LocationListProps = {
  characters: Character[];
  isLoading: boolean;
  locations: Location[];
  onSelectLocation: (id: number) => void;
  selectedLocationId: number | null;
};

export function LocationList({
  characters,
  isLoading,
  locations,
  onSelectLocation,
  selectedLocationId,
}: LocationListProps) {
  const linkedCharacterCounts = characters.reduce<Map<number, number>>((counts, character) => {
    if (character.locationId !== null) {
      counts.set(character.locationId, (counts.get(character.locationId) ?? 0) + 1);
    }

    return counts;
  }, new Map());

  return (
    <Panel badge={<span className="pill">{locations.length}</span>} title="Places">
      {isLoading ? <p className="muted">Loading places...</p> : null}

      {!isLoading && locations.length === 0 ? (
        <p className="muted">No places yet. Create the first one below.</p>
      ) : null}

      <ul className="entity-list">
        {locations.map((location) => (
          <li key={location.id}>
            <button
              className={
                location.id === selectedLocationId
                  ? 'entity-list-item active'
                  : 'entity-list-item'
              }
              onClick={() => {
                onSelectLocation(location.id);
              }}
              type="button"
            >
              <div className="entity-list-heading">
                <strong>{location.name}</strong>
                <span className="pill small">
                  {linkedCharacterCounts.get(location.id) ?? 0} people
                </span>
              </div>
              <span>{location.summary || 'No summary yet.'}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
