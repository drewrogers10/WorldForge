import type { FormEvent } from 'react';
import type { Character } from '@shared/character';
import type { Item } from '@shared/item';
import type { Location } from '@shared/location';
import { Panel } from '@renderer/components/Panel';
import { toNullableId, toSelectValue, type ItemFormState } from '@renderer/lib/forms';

type ItemEditorProps = {
  characters: Character[];
  form: ItemFormState;
  isDeleting?: boolean;
  isLoading?: boolean;
  isSubmitting: boolean;
  item: Item | null;
  locations: Location[];
  mode: 'create' | 'edit';
  onDelete?: () => void | Promise<void>;
  onFormChange: (changes: Partial<ItemFormState>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedItemId: number | null;
};

type AssignmentMode = 'unassigned' | 'character' | 'location';

function getAssignmentMode(form: ItemFormState): AssignmentMode {
  if (form.ownerCharacterId !== null) {
    return 'character';
  }

  if (form.locationId !== null) {
    return 'location';
  }

  return 'unassigned';
}

function getAssignmentSummary(item: Item | null): string {
  if (!item) {
    return 'Unassigned';
  }

  if (item.ownerCharacter) {
    return `Owned by ${item.ownerCharacter.name}`;
  }

  if (item.location) {
    return `Stored at ${item.location.name}`;
  }

  return 'Unassigned';
}

export function ItemEditor({
  characters,
  form,
  isDeleting = false,
  isLoading = false,
  isSubmitting,
  item,
  locations,
  mode,
  onDelete,
  onFormChange,
  onSubmit,
  selectedItemId,
}: ItemEditorProps) {
  const assignmentMode = getAssignmentMode(form);
  const title = mode === 'create' ? 'Create Item' : 'Selected Item';

  const formBody = (
    <form className="form" onSubmit={onSubmit}>
      <label>
        <span>Name</span>
        <input
          name="name"
          onChange={(event) => {
            onFormChange({ name: event.target.value });
          }}
          placeholder="Storm Lens"
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
          placeholder="A short note about the item."
          rows={mode === 'create' ? 6 : 8}
          value={form.summary}
        />
      </label>

      <label>
        <span>Quantity</span>
        <input
          min={0}
          name="quantity"
          onChange={(event) => {
            const parsedQuantity = Number.parseInt(event.target.value, 10);
            onFormChange({
              quantity: Number.isNaN(parsedQuantity) ? 0 : Math.max(0, parsedQuantity),
            });
          }}
          type="number"
          value={String(form.quantity)}
        />
      </label>

      <label>
        <span>Assignment</span>
        <select
          name="assignmentMode"
          onChange={(event) => {
            const nextMode = event.target.value as AssignmentMode;

            if (nextMode === 'character') {
              onFormChange({
                ownerCharacterId: form.ownerCharacterId,
                locationId: null,
              });
              return;
            }

            if (nextMode === 'location') {
              onFormChange({
                ownerCharacterId: null,
                locationId: form.locationId,
              });
              return;
            }

            onFormChange({
              ownerCharacterId: null,
              locationId: null,
            });
          }}
          value={assignmentMode}
        >
          <option value="unassigned">Unassigned</option>
          <option value="character">Owned by person</option>
          <option value="location">Stored at place</option>
        </select>
      </label>

      {assignmentMode === 'character' ? (
        <label>
          <span>Owner</span>
          <select
            name="ownerCharacterId"
            onChange={(event) => {
              onFormChange({ ownerCharacterId: toNullableId(event.target.value) });
            }}
            value={toSelectValue(form.ownerCharacterId)}
          >
            <option value="">Choose a person</option>
            {characters.map((character) => (
              <option key={character.id} value={String(character.id)}>
                {character.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {assignmentMode === 'location' ? (
        <label>
          <span>Place</span>
          <select
            name="locationId"
            onChange={(event) => {
              onFormChange({ locationId: toNullableId(event.target.value) });
            }}
            value={toSelectValue(form.locationId)}
          >
            <option value="">Choose a place</option>
            {locations.map((location) => (
              <option key={location.id} value={String(location.id)}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {assignmentMode === 'character' && characters.length === 0 ? (
        <p className="muted helper-text">
          No saved people yet. Switch to the People workspace to add one.
        </p>
      ) : null}

      {assignmentMode === 'location' && locations.length === 0 ? (
        <p className="muted helper-text">
          No saved places yet. Switch to the Places workspace to add one.
        </p>
      ) : null}

      {mode === 'edit' ? (
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
            {isDeleting ? 'Deleting...' : 'Delete Item'}
          </button>
        </div>
      ) : (
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating...' : 'Create Item'}
        </button>
      )}
    </form>
  );

  if (mode === 'create') {
    return <Panel title={title}>{formBody}</Panel>;
  }

  return (
    <Panel
      badge={item ? <span className="pill">#{item.id}</span> : null}
      className="details-panel"
      title={title}
    >
      {selectedItemId === null ? (
        <p className="muted">Select an item to view and edit it.</p>
      ) : null}

      {selectedItemId !== null && isLoading ? (
        <p className="muted">Loading item details...</p>
      ) : null}

      {item ? (
        <>
          <dl className="detail-grid">
            <div>
              <dt>Created</dt>
              <dd>{new Date(item.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(item.updatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Quantity</dt>
              <dd>{item.quantity}</dd>
            </div>
            <div>
              <dt>Assignment</dt>
              <dd>{getAssignmentSummary(item)}</dd>
            </div>
          </dl>

          <div className="linked-card">
            <p className="card-title">Assignment</p>
            <p className="muted helper-text">{getAssignmentSummary(item)}</p>
          </div>

          {formBody}
        </>
      ) : null}
    </Panel>
  );
}
