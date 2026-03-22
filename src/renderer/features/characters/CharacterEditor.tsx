import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import { formatWorldTick, type TemporalDetailStatus } from '@shared/temporal';
import { Panel } from '@renderer/components/Panel';
import { TemporalInput } from '@renderer/components/TemporalInput';
import {
  toNullableId,
  toSelectValue,
  type CharacterFormState,
} from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';

type CharacterEditorProps = {
  character: Character | null;
  form: CharacterFormState;
  isLoading?: boolean;
  isSubmitting: boolean;
  locations: Location[];
  mode: WorkspaceMode;
  onFormChange: (changes: Partial<CharacterFormState>) => void;
  onSubmit: () => void | Promise<void>;
  selectedCharacterId: number | null;
  selectedCharacterStatus: TemporalDetailStatus;
  tick: number;
};

function describeCharacterStatus(status: TemporalDetailStatus, tick: number): string {
  switch (status) {
    case 'notYetCreated':
      return `This person does not exist yet at ${formatWorldTick(tick)}.`;
    case 'ended':
      return `This person no longer exists at ${formatWorldTick(tick)}.`;
    case 'missing':
      return 'Select a person to view and edit them.';
    default:
      return '';
  }
}

export function CharacterEditor({
  character,
  form,
  isLoading = false,
  isSubmitting,
  locations,
  mode,
  onFormChange,
  onSubmit,
  selectedCharacterId,
  selectedCharacterStatus,
  tick,
}: CharacterEditorProps) {
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
      <Panel title="Create Person">
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

          {effectiveTickField}

          <p className="muted helper-text">
            Use the top bar to save or cancel this new person.
          </p>
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
      {selectedCharacterId === null || selectedCharacterStatus !== 'active' ? (
        <p className="muted">{describeCharacterStatus(selectedCharacterStatus, tick)}</p>
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

              {effectiveTickField}

              <p className="muted helper-text">
                Use the top bar to save, cancel, or end this person.
              </p>
            </form>
          ) : (
            <p className="muted helper-text">
              Use the top bar to edit or end this person.
            </p>
          )}
        </>
      ) : null}
    </Panel>
  );
}
