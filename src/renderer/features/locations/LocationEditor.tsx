import type { ReactNode } from 'react';
import type { Location } from '@shared/location';
import { formatWorldTick, type TemporalDetailStatus } from '@shared/temporal';
import { Panel } from '@renderer/components/Panel';
import { TemporalInput } from '@renderer/components/TemporalInput';
import type { LocationFormState } from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';

type LocationEditorProps = {
  form: LocationFormState;
  isLoading?: boolean;
  isSubmitting: boolean;
  linkedCharacterCount: number;
  linkedItemCount: number;
  linksSlot?: ReactNode;
  location: Location | null;
  mode: WorkspaceMode;
  onFormChange: (changes: Partial<LocationFormState>) => void;
  onSubmit: () => void | Promise<void>;
  selectedLocationId: number | null;
  selectedLocationStatus: TemporalDetailStatus;
  tick: number;
};

function describeLocationStatus(status: TemporalDetailStatus, tick: number): string {
  switch (status) {
    case 'notYetCreated':
      return `This place does not exist yet at ${formatWorldTick(tick)}.`;
    case 'ended':
      return `This place no longer exists at ${formatWorldTick(tick)}.`;
    case 'missing':
      return 'Select a place to view and edit it.';
    default:
      return '';
  }
}

export function LocationEditor({
  form,
  isLoading = false,
  isSubmitting,
  linkedCharacterCount,
  linkedItemCount,
  linksSlot,
  location,
  mode,
  onFormChange,
  onSubmit,
  selectedLocationId,
  selectedLocationStatus,
  tick,
}: LocationEditorProps) {
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const effectiveTickField = (
    <TemporalInput
      onChange={(effectiveTick) => {
        onFormChange({ effectiveTick });
      }}
      value={form.effectiveTick}
    />
  );

  if (isCreateMode) {
    return (
      <Panel title="Create Place">
        <form
          aria-busy={isSubmitting}
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
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

          <p className="muted helper-text">
            Use the top bar to save or cancel this new place.
          </p>
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

          {isEditMode ? (
            <form
              aria-busy={isSubmitting}
              className="form"
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
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

              <p className="muted helper-text">
                Use the top bar to save, cancel, or end this place.
              </p>
            </form>
          ) : (
            <p className="muted helper-text">
              Use the top bar to edit or end this place.
            </p>
          )}

          {linksSlot}
        </>
      ) : null}
    </Panel>
  );
}
