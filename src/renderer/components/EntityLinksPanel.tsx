import { useEffect, useState, type FormEvent } from 'react';
import type {
  CreateEntityLinkInput,
  EntityKind,
  EntityLink,
  LinkKind,
} from '@shared/entity-link';
import { getErrorMessage } from '@renderer/lib/forms';
import { useUiStore } from '@renderer/store/uiStore';

type EntityLinkFormState = Omit<CreateEntityLinkInput, 'entityKind' | 'entityId'>;

type EntityLinksPanelProps = {
  emptyMessage?: string;
  entityId: number | null;
  entityKind: EntityKind;
  title?: string;
};

function createEmptyForm(): EntityLinkFormState {
  return {
    linkKind: 'file',
    label: '',
    target: '',
  };
}

export function EntityLinksPanel({
  emptyMessage = 'Select a record to manage its links.',
  entityId,
  entityKind,
  title = 'Linked Files',
}: EntityLinksPanelProps) {
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);
  const [links, setLinks] = useState<EntityLink[]>([]);
  const [form, setForm] = useState<EntityLinkFormState>(createEmptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadLinks() {
      if (entityId === null) {
        setLinks([]);
        setEditingId(null);
        setForm(createEmptyForm());
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextLinks = await window.worldForge.listEntityLinks({
          entityKind,
          entityId,
        });
        setLinks(nextLinks);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadLinks();
  }, [entityId, entityKind, setErrorMessage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (entityId === null) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (editingId === null) {
        const created = await window.worldForge.createEntityLink({
          entityKind,
          entityId,
          ...form,
        });
        setLinks((current) => [created, ...current]);
      } else {
        const updated = await window.worldForge.updateEntityLink({
          id: editingId,
          entityKind,
          entityId,
          ...form,
        });
        setLinks((current) =>
          current.map((link) => (link.id === updated.id ? updated : link)),
        );
      }

      setEditingId(null);
      setForm(createEmptyForm());
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLink(id: number) {
    setErrorMessage(null);

    try {
      await window.worldForge.deleteEntityLink({ id });
      setLinks((current) => current.filter((link) => link.id !== id));

      if (editingId === id) {
        setEditingId(null);
        setForm(createEmptyForm());
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function handleStartEdit(link: EntityLink) {
    setEditingId(link.id);
    setForm({
      linkKind: link.linkKind,
      label: link.label,
      target: link.target,
    });
  }

  function handleKindChange(linkKind: LinkKind) {
    setForm((current) => ({ ...current, linkKind }));
  }

  return (
    <div className="linked-card">
      <p className="card-title">{title}</p>

      {entityId === null ? <p className="muted helper-text">{emptyMessage}</p> : null}
      {entityId !== null && isLoading ? <p className="muted helper-text">Loading links...</p> : null}

      {entityId !== null && !isLoading ? (
        <>
          {links.length === 0 ? (
            <p className="muted helper-text">No links yet.</p>
          ) : (
            <ul className="entity-list">
              {links.map((link) => (
                <li key={link.id}>
                  <div className="entity-list-item">
                    <div className="entity-list-heading">
                      <strong>{link.label}</strong>
                      <div className="entity-list-pills">
                        <span className="pill small">{link.linkKind}</span>
                      </div>
                    </div>
                    <span>{link.target}</span>
                    <div className="button-row">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          handleStartEdit(link);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="danger-button"
                        onClick={() => {
                          void handleDeleteLink(link.id);
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className="form" onSubmit={handleSubmit}>
            <label>
              <span>Link Type</span>
              <select
                onChange={(event) => {
                  handleKindChange(event.target.value as LinkKind);
                }}
                value={form.linkKind}
              >
                <option value="file">File path</option>
                <option value="url">URL</option>
              </select>
            </label>

            <label>
              <span>Label</span>
              <input
                onChange={(event) => {
                  setForm((current) => ({ ...current, label: event.target.value }));
                }}
                placeholder="Settlement notes"
                required
                value={form.label}
              />
            </label>

            <label>
              <span>Target</span>
              <input
                onChange={(event) => {
                  setForm((current) => ({ ...current, target: event.target.value }));
                }}
                placeholder={form.linkKind === 'file' ? '/path/to/file.md' : 'https://example.com'}
                required
                value={form.target}
              />
            </label>

            <div className="button-row">
              <button disabled={isSaving} type="submit">
                {isSaving
                  ? editingId === null
                    ? 'Adding...'
                    : 'Saving...'
                  : editingId === null
                    ? 'Add Link'
                    : 'Save Link'}
              </button>
              {editingId !== null ? (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(createEmptyForm());
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}
