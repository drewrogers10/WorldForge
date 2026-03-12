import type { FormEvent } from 'react';
import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import { Panel } from '@renderer/components/Panel';
import {
  toNullableId,
  toSelectValue,
  type CharacterFormState,
} from '@renderer/lib/forms';

type CharacterEditorProps = {
  character: Character | null;
  form: CharacterFormState;
  isDeleting?: boolean;
  isLoading?: boolean;
  isSubmitting: boolean;
  locations: Location[];
  mode: 'create' | 'edit';
  onDelete?: () => void | Promise<void>;
  onFormChange: (changes: Partial<CharacterFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedCharacterId: number | null;
};

export function CharacterEditor({
  character,
  form,
  isDeleting = false,
  isLoading = false,
  isSubmitting,
  locations,
  mode,
  onDelete,
  onFormChange,
  onSubmit,
  selectedCharacterId,
}: CharacterEditorProps) {
  if (mode === 'create') {
    return (
      <Panel title="Create Person">
        <form className="form" onSubmit={onSubmit}>
          <label>
            <span>Name</span>
            <input
              name="name"
              onChange={(event) => {
                onFormChange({ name: event.target.value });
              }}
              placeholder="Aeris Vale"
              required
              value={form.name}
            />
          </label>

          <label>
            <span>Summary</span>
            <textarea
              name="summary"
              onChange={(event) => {
                onFormChange({ summary: event.target.value });
              }}
              placeholder="A short note about the person."
              rows={6}
              value={form.summary}
            />
          </label>

          <label>
            <span>Place</span>
            <select
              name="locationId"
              onChange={(event) => {
                onFormChange({ locationId: toNullableId(event.target.value) });
              }}
              value={toSelectValue(form.locationId)}
            >
              <option value="">Unassigned</option>
              {locations.map((location) => (
                <option key={location.id} value={String(location.id)}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating...' : 'Create Person'}
          </button>
        </form>
      </Panel>
    );
  }

  return (
    <Panel
      badge={character ? <span className="pill">#{character.id}</span> : null}
      className="details-panel"
      title="Selected Person"
    >
      {selectedCharacterId === null ? (
        <p className="muted">Select a person to view and edit them.</p>
      ) : null}

      {selectedCharacterId !== null && isLoading ? (
        <p className="muted">Loading person details...</p>
      ) : null}

      {character ? (
        <>
          <dl className="detail-grid">
            <div>
              <dt>Created</dt>
              <dd>{new Date(character.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(character.updatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Linked Place</dt>
              <dd>{character.location?.name ?? 'Unassigned'}</dd>
            </div>
          </dl>

          <div className="linked-card">
            <p className="card-title">Place Link</p>
            <p className="muted helper-text">
              {character.location
                ? `${character.name} is currently linked to ${character.location.name}.`
                : 'This person is currently unassigned.'}
            </p>
          </div>

          <form className="form" onSubmit={onSubmit}>
            <label>
              <span>Name</span>
              <input
                name="name"
                onChange={(event) => {
                  onFormChange({ name: event.target.value });
                }}
                required
                value={form.name}
              />
            </label>

            <label>
              <span>Summary</span>
              <textarea
                name="summary"
                onChange={(event) => {
                  onFormChange({ summary: event.target.value });
                }}
                rows={8}
                value={form.summary}
              />
            </label>

            <label>
              <span>Place</span>
              <select
                name="locationId"
                onChange={(event) => {
                  onFormChange({ locationId: toNullableId(event.target.value) });
                }}
                value={toSelectValue(form.locationId)}
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
                No saved places yet. Switch to the Places workspace to add one.
              </p>
            ) : null}

            <div className="button-row">
              <button disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="danger-button"
                disabled={isDeleting || isSubmitting}
                onClick={() => {
                  void onDelete?.();
                }}
                type="button"
              >
                {isDeleting ? 'Deleting...' : 'Delete Person'}
              </button>
            </div>
          </form>
        </>
      ) : null}
    </Panel>
  );
}
