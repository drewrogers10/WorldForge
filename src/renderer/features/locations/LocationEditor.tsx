import type { FormEvent } from 'react';
import type { Location } from '@shared/location';
import { Panel } from '@renderer/components/Panel';
import type { LocationFormState } from '@renderer/lib/forms';

type LocationEditorProps = {
  form: LocationFormState;
  isLoading?: boolean;
  isSubmitting: boolean;
  linkedCharacterCount: number;
  location: Location | null;
  mode: 'create' | 'edit';
  onFormChange: (changes: Partial<LocationFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedLocationId: number | null;
};

export function LocationEditor({
  form,
  isLoading = false,
  isSubmitting,
  linkedCharacterCount,
  location,
  mode,
  onFormChange,
  onSubmit,
  selectedLocationId,
}: LocationEditorProps) {
  if (mode === 'create') {
    return (
      <Panel title="Create Place">
        <form className="form" onSubmit={onSubmit}>
          <label>
            <span>Name</span>
            <input
              name="name"
              onChange={(event) => {
                onFormChange({ name: event.target.value });
              }}
              placeholder="The Glass Coast"
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
              placeholder="A short note about the place."
              rows={6}
              value={form.summary}
            />
          </label>

          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating...' : 'Create Place'}
          </button>
        </form>
      </Panel>
    );
  }

  return (
    <Panel
      badge={location ? <span className="pill">#{location.id}</span> : null}
      className="details-panel"
      title="Selected Place"
    >
      {selectedLocationId === null ? (
        <p className="muted">Select a place to view and edit it.</p>
      ) : null}

      {selectedLocationId !== null && isLoading ? (
        <p className="muted">Loading place details...</p>
      ) : null}

      {location ? (
        <>
          <dl className="detail-grid">
            <div>
              <dt>Created</dt>
              <dd>{new Date(location.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(location.updatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Linked People</dt>
              <dd>{linkedCharacterCount}</dd>
            </div>
          </dl>

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

            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </>
      ) : null}
    </Panel>
  );
}
