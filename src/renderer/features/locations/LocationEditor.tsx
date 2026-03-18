import type { FormEvent } from 'react';
import type { Location } from '@shared/location';
import type { TemporalDetailStatus } from '@shared/temporal';
import { Panel } from '@renderer/components/Panel';
import type { LocationFormState } from '@renderer/lib/forms';

type LocationEditorProps = {
  form: LocationFormState;
  isDeleting?: boolean;
  isLoading?: boolean;
  isSubmitting: boolean;
  linkedCharacterCount: number;
  linkedItemCount: number;
  location: Location | null;
  mode: 'create' | 'edit';
  onDelete?: () => void | Promise<void>;
  onFormChange: (changes: Partial<LocationFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedLocationId: number | null;
  selectedLocationStatus: TemporalDetailStatus;
  tick: number;
};

function describeLocationStatus(status: TemporalDetailStatus, tick: number): string {
  switch (status) {
    case 'notYetCreated':
      return `This place does not exist yet at tick ${tick}.`;
    case 'ended':
      return `This place no longer exists at tick ${tick}.`;
    case 'missing':
      return 'Select a place to view and edit it.';
    default:
      return '';
  }
}

export function LocationEditor({
  form,
  isDeleting = false,
  isLoading = false,
  isSubmitting,
  linkedCharacterCount,
  linkedItemCount,
  location,
  mode,
  onDelete,
  onFormChange,
  onSubmit,
  selectedLocationId,
  selectedLocationStatus,
  tick,
}: LocationEditorProps) {
  const effectiveTickField = (
    <label>
      <span>Effective Tick</span>
      <input
        min={0}
        name="effectiveTick"
        onChange={(event) => {
          onFormChange({ effectiveTick: Number(event.target.value) || 0 });
        }}
        type="number"
        value={String(form.effectiveTick)}
      />
    </label>
  );

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

          {effectiveTickField}

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
      {selectedLocationId === null || selectedLocationStatus !== 'active' ? (
        <p className="muted">{describeLocationStatus(selectedLocationStatus, tick)}</p>
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
            <div>
              <dt>Linked Items</dt>
              <dd>{linkedItemCount}</dd>
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

            {effectiveTickField}

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
                {isDeleting ? 'Ending...' : 'End Place'}
              </button>
            </div>
          </form>
        </>
      ) : null}
    </Panel>
  );
}
