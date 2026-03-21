import type { Character } from '@shared/character';
import type { Item } from '@shared/item';
import type { Location } from '@shared/location';
import { Panel } from '@renderer/components/Panel';
import type { WorkspaceView } from '@renderer/lib/forms';
import { useThemeStore, getThemeDetails } from '@renderer/store/themeStore';

type WorldOverviewProps = {
  changedCharacterIds: ReadonlySet<number>;
  changedItemIds: ReadonlySet<number>;
  changedLocationIds: ReadonlySet<number>;
  characters: Character[];
  isLoading: boolean;
  items: Item[];
  locations: Location[];
  onViewChange: (view: WorkspaceView) => void;
  overviewDelta: {
    gaps: number;
    items: number;
    people: number;
    places: number;
  };
  tick: number;
};

type SpotlightLocation = {
  id: number;
  name: string;
  characterCount: number;
  itemCount: number;
};

type RecentRecord = {
  createdAt: string;
  id: number;
  isChanged: boolean;
  kind: 'Person' | 'Place' | 'Item';
  label: string;
  note: string;
};

const formatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

function formatDelta(delta: number): string | null {
  if (delta === 0) {
    return null;
  }

  return delta > 0 ? `+${delta}` : String(delta);
}

export function WorldOverview({
  changedCharacterIds,
  changedItemIds,
  changedLocationIds,
  characters,
  isLoading,
  items,
  locations,
  onViewChange,
  overviewDelta,
  tick,
}: WorldOverviewProps) {
  const { theme } = useThemeStore();
  const themeDetails = getThemeDetails(theme);

  const locatedCharacters = characters.filter((character) => character.locationId !== null);
  const unplacedCharacters = characters.length - locatedCharacters.length;
  const ownedItems = items.filter((item) => item.ownerCharacterId !== null);
  const storedItems = items.filter((item) => item.locationId !== null);
  const unassignedItems = items.filter(
    (item) => item.ownerCharacterId === null && item.locationId === null,
  );
  const totalItemUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const locationSpotlights: SpotlightLocation[] = locations
    .map((location) => ({
      id: location.id,
      name: location.name,
      characterCount: characters.filter((character) => character.locationId === location.id)
        .length,
      itemCount: items.filter((item) => item.locationId === location.id).length,
    }))
    .sort(
      (left, right) =>
        right.characterCount +
        right.itemCount -
        (left.characterCount + left.itemCount) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, 3);
  const activeLocationCount = locations.filter(
    (location) =>
      characters.some((character) => character.locationId === location.id) ||
      items.some((item) => item.locationId === location.id),
  ).length;

  const recentRecords: RecentRecord[] = [
    ...characters.map((character) => ({
      createdAt: character.createdAt,
      id: character.id,
      isChanged: changedCharacterIds.has(character.id),
      kind: 'Person' as const,
      label: character.name,
      note: character.location?.name ?? 'No place assigned',
    })),
    ...locations.map((location) => ({
      createdAt: location.createdAt,
      id: location.id,
      isChanged: changedLocationIds.has(location.id),
      kind: 'Place' as const,
      label: location.name,
      note: location.summary || 'No summary yet',
    })),
    ...items.map((item) => ({
      createdAt: item.createdAt,
      id: item.id,
      isChanged: changedItemIds.has(item.id),
      kind: 'Item' as const,
      label: item.name,
      note:
        item.ownerCharacter?.name ??
        item.location?.name ??
        'Unassigned to a person or place',
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 5);

  const worldReadiness = [
    {
      label: 'People with a place',
      value: `${locatedCharacters.length}/${characters.length || 0}`,
      detail:
        characters.length > 0
          ? `${Math.round((locatedCharacters.length / characters.length) * 100)}% grounded in the map`
          : 'Add people to start mapping your cast',
    },
    {
      label: 'Items assigned',
      value: `${ownedItems.length + storedItems.length}/${items.length || 0}`,
      detail:
        items.length > 0
          ? `${unassignedItems.length} still need an owner or location`
          : 'Add items to start tracking world assets',
    },
    {
      label: 'Active places',
      value: `${activeLocationCount}/${locations.length || 0}`,
      detail:
        locations.length > 0
          ? 'Top hubs shown below by linked people and items'
          : 'Add places to create world anchors',
    },
  ];

  return (
    <main className="overview-layout">
      <Panel className="overview-hero-panel" title="World Overview">
        <div className="overview-hero">
          <div className="overview-hero-copy">
            <p className="eyebrow">Setting Snapshot</p>
            <h3>
              {themeDetails.heroLine1}{' '}
              <em>{themeDetails.heroLine2}</em>
            </h3>
            <p className="muted">
              This slice reflects world tick {tick} and highlights what changed since the
              previous committed position.
            </p>
          </div>

          <div className="overview-metric-grid">
            <OverviewMetric
              delta={formatDelta(overviewDelta.people)}
              label="People"
              tone="blue"
              value={characters.length}
            />
            <OverviewMetric
              delta={formatDelta(overviewDelta.places)}
              label="Places"
              tone="gold"
              value={locations.length}
            />
            <OverviewMetric
              delta={formatDelta(overviewDelta.items)}
              label="Items"
              tone="green"
              value={`${items.length} / ${totalItemUnits} units`}
            />
            <OverviewMetric
              delta={formatDelta(overviewDelta.gaps)}
              label="Coverage Gaps"
              tone="rose"
              value={unplacedCharacters + unassignedItems.length}
            />
          </div>
        </div>
      </Panel>

      <div className="overview-main-grid">
        <Panel className="overview-story-panel" title="World Pulse">
          {isLoading ? (
            <p className="muted">Loading the current state of the world...</p>
          ) : (
            <div className="overview-readiness-list">
              {worldReadiness.map((item) => (
                <div className="readiness-row" key={item.label}>
                  <div>
                    <p className="card-title">{item.label}</p>
                    <p className="muted helper-text">{item.detail}</p>
                  </div>
                  <span className="pill">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="overview-action-panel" title="Jump Into a Workspace">
          <div className="overview-action-grid">
            <OverviewActionCard
              body="Shape the cast, review who still needs a home, and move into individual edits only when necessary."
              cta="Open People"
              eyebrow="Cast"
              onClick={() => {
                onViewChange('people');
              }}
              stat={`${characters.length} tracked`}
              title="People"
            />
            <OverviewActionCard
              body="Check hubs, empty regions, and which places are actually carrying world state."
              cta="Open Places"
              eyebrow="Map"
              onClick={() => {
                onViewChange('places');
              }}
              stat={`${locations.length} anchors`}
              title="Places"
            />
            <OverviewActionCard
              body="Review ownership, storage, and loose assets without starting from the raw item table."
              cta="Open Items"
              eyebrow="Assets"
              onClick={() => {
                onViewChange('items');
              }}
              stat={`${unassignedItems.length} unassigned`}
              title="Items"
            />
          </div>
        </Panel>

        <Panel className="overview-spotlight-panel" title="Most Connected Places">
          {locationSpotlights.length > 0 ? (
            <div className="spotlight-list">
              {locationSpotlights.map((location) => (
                <article className="linked-card overview-spotlight-card" key={location.id}>
                  <div className="entity-list-heading">
                    <p className="card-title">{location.name}</p>
                    <div className="entity-list-pills">
                      {changedLocationIds.has(location.id) ? (
                        <span className="pill small highlight">Changed</span>
                      ) : null}
                      <span className="pill small subtle">
                        {location.characterCount + location.itemCount} links
                      </span>
                    </div>
                  </div>
                  <p className="muted helper-text">
                    {location.characterCount} people and {location.itemCount} items are tied to
                    this place.
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">
              Add places first, then connect people and items to turn geography into structure.
            </p>
          )}
        </Panel>

        <Panel className="overview-recent-panel" title="Recent Additions">
          {recentRecords.length > 0 ? (
            <div className="overview-recent-list">
              {recentRecords.map((record) => (
                <div className="overview-recent-item" key={`${record.kind}-${record.id}`}>
                  <div>
                    <p className="card-title">{record.label}</p>
                    <p className="muted helper-text">{record.note}</p>
                  </div>
                  <div className="overview-recent-meta">
                    {record.isChanged ? (
                      <span className="pill small highlight">Changed</span>
                    ) : null}
                    <span className="pill small subtle">{record.kind}</span>
                    <span className="muted">{formatCreatedAt(record.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No records yet. Start with a place or a person to seed the world.</p>
          )}
        </Panel>

        <Panel className="overview-roadmap-panel" title="World Areas">
          <div className="overview-roadmap-grid">
            <RoadmapCard
              description="Character, location, and item records are live now."
              title="Active Foundations"
            />
            <RoadmapCard
              description="Powers, events, and organizations are scaffolded and ready for deeper modeling next."
              title="Next Layers"
            />
          </div>
        </Panel>
      </div>
    </main>
  );
}

type OverviewMetricProps = {
  delta: string | null;
  label: string;
  tone: 'blue' | 'gold' | 'green' | 'rose';
  value: number | string;
};

function OverviewMetric({ delta, label, tone, value }: OverviewMetricProps) {
  return (
    <div className={`overview-metric-card ${tone}`}>
      <span className="overview-metric-label">{label}</span>
      <strong className="overview-metric-value">{value}</strong>
      {delta ? <span className="overview-metric-delta">Since previous tick: {delta}</span> : null}
    </div>
  );
}

type OverviewActionCardProps = {
  body: string;
  cta: string;
  eyebrow: string;
  onClick: () => void;
  stat: string;
  title: string;
};

function OverviewActionCard({
  body,
  cta,
  eyebrow,
  onClick,
  stat,
  title,
}: OverviewActionCardProps) {
  return (
    <article className="linked-card overview-action-card">
      <p className="eyebrow">{eyebrow}</p>
      <div className="entity-list-heading">
        <p className="card-title">{title}</p>
        <span className="pill small subtle">{stat}</span>
      </div>
      <p className="muted helper-text">{body}</p>
      <button className="secondary-button" onClick={onClick} type="button">
        {cta}
      </button>
    </article>
  );
}

type RoadmapCardProps = {
  description: string;
  title: string;
};

function RoadmapCard({ description, title }: RoadmapCardProps) {
  return (
    <article className="linked-card overview-roadmap-card">
      <p className="card-title">{title}</p>
      <p className="muted helper-text">{description}</p>
    </article>
  );
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return formatter.format(date);
}
