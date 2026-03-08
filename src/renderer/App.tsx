import { useEffect, useState } from 'react';
import type { Character } from '@shared/character';

type CharacterFormState = {
  name: string;
  summary: string;
};

const emptyForm = (): CharacterFormState => ({
  name: '',
  summary: '',
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [createForm, setCreateForm] = useState<CharacterFormState>(emptyForm);
  const [editForm, setEditForm] = useState<CharacterFormState>(emptyForm);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshCharacters();
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setSelectedCharacter(null);
      setEditForm(emptyForm());
      return;
    }

    void loadCharacter(selectedId);
  }, [selectedId]);

  async function refreshCharacters(preferredId?: number): Promise<void> {
    setIsLoadingList(true);
    setErrorMessage(null);

    try {
      const records = await window.worldForge.listCharacters();
      setCharacters(records);

      setSelectedId((currentId) => {
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
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingList(false);
    }
  }

  async function loadCharacter(id: number): Promise<void> {
    setIsLoadingDetails(true);
    setErrorMessage(null);

    try {
      const record = await window.worldForge.getCharacter({ id });
      setSelectedCharacter(record);
      setEditForm(
        record
          ? {
              name: record.name,
              summary: record.summary,
            }
          : emptyForm(),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function handleCreateCharacter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createCharacter(createForm);
      setCreateForm(emptyForm());
      await refreshCharacters(created.id);
      setSelectedCharacter(created);
      setEditForm({
        name: created.name,
        summary: created.summary,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateCharacter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedId === null) {
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const updated = await window.worldForge.updateCharacter({
        id: selectedId,
        ...editForm,
      });
      await refreshCharacters(updated.id);
      setSelectedCharacter(updated);
      setEditForm({
        name: updated.name,
        summary: updated.summary,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">WorldForge</p>
          <h1>Character Workshop</h1>
        </div>
        <button
          className="secondary-button"
          onClick={() => {
            void refreshCharacters(selectedId ?? undefined);
          }}
          type="button"
        >
          Refresh
        </button>
      </header>

      {errorMessage ? <div className="status error">{errorMessage}</div> : null}

      <main className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Characters</h2>
            <span className="pill">{characters.length}</span>
          </div>

          {isLoadingList ? <p className="muted">Loading characters...</p> : null}

          {!isLoadingList && characters.length === 0 ? (
            <p className="muted">No characters yet. Create the first one below.</p>
          ) : null}

          <ul className="character-list">
            {characters.map((character) => (
              <li key={character.id}>
                <button
                  className={
                    character.id === selectedId
                      ? 'character-list-item active'
                      : 'character-list-item'
                  }
                  onClick={() => {
                    setSelectedId(character.id);
                  }}
                  type="button"
                >
                  <strong>{character.name}</strong>
                  <span>{character.summary || 'No summary yet.'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel details-panel">
          <div className="panel-header">
            <h2>Selected Character</h2>
            {selectedCharacter ? (
              <span className="pill">#{selectedCharacter.id}</span>
            ) : null}
          </div>

          {selectedId === null ? (
            <p className="muted">Select a character to view and edit it.</p>
          ) : null}

          {selectedId !== null && isLoadingDetails ? (
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
              </dl>

              <form className="form" onSubmit={handleUpdateCharacter}>
                <label>
                  <span>Name</span>
                  <input
                    name="name"
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                    value={editForm.name}
                  />
                </label>

                <label>
                  <span>Summary</span>
                  <textarea
                    name="summary"
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        summary: event.target.value,
                      }))
                    }
                    rows={8}
                    value={editForm.summary}
                  />
                </label>

                <button disabled={isUpdating} type="submit">
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
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
                  setCreateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Aeris Vale"
                required
                value={createForm.name}
              />
            </label>

            <label>
              <span>Summary</span>
              <textarea
                name="summary"
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                placeholder="A short note about the character."
                rows={6}
                value={createForm.summary}
              />
            </label>

            <button disabled={isCreating} type="submit">
              {isCreating ? 'Creating...' : 'Create Character'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
