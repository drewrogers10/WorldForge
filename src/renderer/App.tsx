import { useEffect, useState } from 'react';
import type { Character } from '@shared/character';
import type { Location } from '@shared/location';

type WorkspaceView = 'characters' | 'locations';

type CharacterFormState = {
  name: string;
  summary: string;
  locationId: number | null;
};

type LocationFormState = {
  name: string;
  summary: string;
};

const emptyCharacterForm = (): CharacterFormState => ({
  name: '',
  summary: '',
  locationId: null,
});

const emptyLocationForm = (): LocationFormState => ({
  name: '',
  summary: '',
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function toSelectValue(value: number | null): string {
  return value === null ? '' : String(value);
}

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

  async function handleCreateCharacter(event: React.FormEvent<HTMLFormElement>) {
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

  async function handleUpdateCharacter(event: React.FormEvent<HTMLFormElement>) {
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

  async function handleCreateLocation(event: React.FormEvent<HTMLFormElement>) {
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

  async function handleUpdateLocation(event: React.FormEvent<HTMLFormElement>) {
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
    <div className="app-shell">
      <header className="app-header">
        <div className="header-copy">
          <div>
            <p className="eyebrow">WorldForge</p>
            <h1>World Workshop</h1>
          </div>

          <div className="entity-switcher" aria-label="Entity Workspace">
            <button
              className={
                activeView === 'characters' ? 'workspace-button active' : 'workspace-button'
              }
              onClick={() => {
                setActiveView('characters');
              }}
              type="button"
            >
              Characters
            </button>
            <button
              className={
                activeView === 'locations' ? 'workspace-button active' : 'workspace-button'
              }
              onClick={() => {
                setActiveView('locations');
              }}
              type="button"
            >
              Locations
            </button>
          </div>
        </div>

        <button
          className="secondary-button"
          disabled={isRefreshingAll}
          onClick={() => {
            void handleRefreshAll();
          }}
          type="button"
        >
          {isRefreshingAll ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {errorMessage ? <div className="status error">{errorMessage}</div> : null}

      <main className="content-grid">
        {activeView === 'characters' ? (
          <>
            <section className="panel">
              <div className="panel-header">
                <h2>Characters</h2>
                <span className="pill">
                  {filteredCharacters.length}/{characters.length}
                </span>
              </div>

              <div className="list-controls">
                <label>
                  <span>Search</span>
                  <input
                    onChange={(event) => {
                      setCharacterSearch(event.target.value);
                    }}
                    placeholder="Search name, summary, or location"
                    value={characterSearch}
                  />
                </label>

                <label>
                  <span>Filter by location</span>
                  <select
                    onChange={(event) => {
                      setCharacterLocationFilter(event.target.value);
                    }}
                    value={characterLocationFilter}
                  >
                    <option value="all">All characters</option>
                    <option value="unassigned">Unassigned only</option>
                    {locations.map((location) => (
                      <option key={location.id} value={String(location.id)}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isLoadingCharacters ? <p className="muted">Loading characters...</p> : null}

              {!isLoadingCharacters && characters.length === 0 ? (
                <p className="muted">No characters yet. Create the first one below.</p>
              ) : null}

              {!isLoadingCharacters &&
              characters.length > 0 &&
              filteredCharacters.length === 0 ? (
                <p className="muted">No characters match the current search or filter.</p>
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
                        setSelectedCharacterId(character.id);
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
            </section>

            <section className="panel details-panel">
              <div className="panel-header">
                <h2>Selected Character</h2>
                {selectedCharacter ? <span className="pill">#{selectedCharacter.id}</span> : null}
              </div>

              {selectedCharacterId === null ? (
                <p className="muted">Select a character to view and edit it.</p>
              ) : null}

              {selectedCharacterId !== null && isLoadingCharacterDetails ? (
                <p className="muted">Loading character details...</p>
              ) : null}

              {selectedCharacter ? (
                <>
                  <dl className="detail-grid">
                    <div>
                      <dt>Created</dt>
                      <dd>{new Date(selectedCharacter.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{new Date(selectedCharacter.updatedAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Linked Location</dt>
                      <dd>{selectedCharacter.location?.name ?? 'Unassigned'}</dd>
                    </div>
                  </dl>

                  <div className="linked-card">
                    <p className="card-title">Location Link</p>
                    <p className="muted helper-text">
                      {selectedCharacter.location
                        ? `${selectedCharacter.name} is currently linked to ${selectedCharacter.location.name}.`
                        : 'This character is currently unassigned.'}
                    </p>
                  </div>

                  <form className="form" onSubmit={handleUpdateCharacter}>
                    <label>
                      <span>Name</span>
                      <input
                        name="name"
                        onChange={(event) =>
                          setEditCharacterForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                        value={editCharacterForm.name}
                      />
                    </label>

                    <label>
                      <span>Summary</span>
                      <textarea
                        name="summary"
                        onChange={(event) =>
                          setEditCharacterForm((current) => ({
                            ...current,
                            summary: event.target.value,
                          }))
                        }
                        rows={8}
                        value={editCharacterForm.summary}
                      />
                    </label>

                    <label>
                      <span>Location</span>
                      <select
                        name="locationId"
                        onChange={(event) =>
                          setEditCharacterForm((current) => ({
                            ...current,
                            locationId: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }))
                        }
                        value={toSelectValue(editCharacterForm.locationId)}
                      >
                        <option value="">Unassigned</option>
                        {locations.map((location) => (
                          <option key={location.id} value={String(location.id)}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {locations.length === 0 ? (
                      <p className="muted helper-text">
                        No saved locations yet. Switch to the Locations workspace to add one.
                      </p>
                    ) : null}

                    <div className="button-row">
                      <button disabled={isUpdatingCharacter} type="submit">
                        {isUpdatingCharacter ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        className="danger-button"
                        disabled={isDeletingCharacter || isUpdatingCharacter}
                        onClick={() => {
                          void handleDeleteCharacter();
                        }}
                        type="button"
                      >
                        {isDeletingCharacter ? 'Deleting...' : 'Delete Character'}
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Create Character</h2>
              </div>

              <form className="form" onSubmit={handleCreateCharacter}>
                <label>
                  <span>Name</span>
                  <input
                    name="name"
                    onChange={(event) =>
                      setCreateCharacterForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Aeris Vale"
                    required
                    value={createCharacterForm.name}
                  />
                </label>

                <label>
                  <span>Summary</span>
                  <textarea
                    name="summary"
                    onChange={(event) =>
                      setCreateCharacterForm((current) => ({
                        ...current,
                        summary: event.target.value,
                      }))
                    }
                    placeholder="A short note about the character."
                    rows={6}
                    value={createCharacterForm.summary}
                  />
                </label>

                <label>
                  <span>Location</span>
                  <select
                    name="locationId"
                    onChange={(event) =>
                      setCreateCharacterForm((current) => ({
                        ...current,
                        locationId: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                    value={toSelectValue(createCharacterForm.locationId)}
                  >
                    <option value="">Unassigned</option>
                    {locations.map((location) => (
                      <option key={location.id} value={String(location.id)}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button disabled={isCreatingCharacter} type="submit">
                  {isCreatingCharacter ? 'Creating...' : 'Create Character'}
                </button>
              </form>
            </section>
          </>
        ) : (
          <>
            <section className="panel">
              <div className="panel-header">
                <h2>Locations</h2>
                <span className="pill">{locations.length}</span>
              </div>

              {isLoadingLocations ? <p className="muted">Loading locations...</p> : null}

              {!isLoadingLocations && locations.length === 0 ? (
                <p className="muted">No locations yet. Create the first one below.</p>
              ) : null}

              <ul className="entity-list">
                {locations.map((location) => {
                  const linkedCount = characters.filter(
                    (character) => character.locationId === location.id,
                  ).length;

                  return (
                    <li key={location.id}>
                      <button
                        className={
                          location.id === selectedLocationId
                            ? 'entity-list-item active'
                            : 'entity-list-item'
                        }
                        onClick={() => {
                          setSelectedLocationId(location.id);
                        }}
                        type="button"
                      >
                        <div className="entity-list-heading">
                          <strong>{location.name}</strong>
                          <span className="pill small">
                            {linkedCount} linked
                          </span>
                        </div>
                        <span>{location.summary || 'No summary yet.'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="panel details-panel">
              <div className="panel-header">
                <h2>Selected Location</h2>
                {selectedLocation ? <span className="pill">#{selectedLocation.id}</span> : null}
              </div>

              {selectedLocationId === null ? (
                <p className="muted">Select a location to view and edit it.</p>
              ) : null}

              {selectedLocationId !== null && isLoadingLocationDetails ? (
                <p className="muted">Loading location details...</p>
              ) : null}

              {selectedLocation ? (
                <>
                  <dl className="detail-grid">
                    <div>
                      <dt>Created</dt>
                      <dd>{new Date(selectedLocation.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{new Date(selectedLocation.updatedAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Linked Characters</dt>
                      <dd>{selectedLocationCharacterCount}</dd>
                    </div>
                  </dl>

                  <form className="form" onSubmit={handleUpdateLocation}>
                    <label>
                      <span>Name</span>
                      <input
                        name="name"
                        onChange={(event) =>
                          setEditLocationForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                        value={editLocationForm.name}
                      />
                    </label>

                    <label>
                      <span>Summary</span>
                      <textarea
                        name="summary"
                        onChange={(event) =>
                          setEditLocationForm((current) => ({
                            ...current,
                            summary: event.target.value,
                          }))
                        }
                        rows={8}
                        value={editLocationForm.summary}
                      />
                    </label>

                    <button disabled={isUpdatingLocation} type="submit">
                      {isUpdatingLocation ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </>
              ) : null}
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Create Location</h2>
              </div>

              <form className="form" onSubmit={handleCreateLocation}>
                <label>
                  <span>Name</span>
                  <input
                    name="name"
                    onChange={(event) =>
                      setCreateLocationForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="The Glass Coast"
                    required
                    value={createLocationForm.name}
                  />
                </label>

                <label>
                  <span>Summary</span>
                  <textarea
                    name="summary"
                    onChange={(event) =>
                      setCreateLocationForm((current) => ({
                        ...current,
                        summary: event.target.value,
                      }))
                    }
                    placeholder="A short note about the location."
                    rows={6}
                    value={createLocationForm.summary}
                  />
                </label>

                <button disabled={isCreatingLocation} type="submit">
                  {isCreatingLocation ? 'Creating...' : 'Create Location'}
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
