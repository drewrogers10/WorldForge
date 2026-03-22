import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Event } from '@shared/event';
import type { Location } from '@shared/location';
import { formatWorldTick, type TemporalDetailStatus } from '@shared/temporal';
import { EntityLinksPanel } from '@renderer/components/EntityLinksPanel';
import { Panel } from '@renderer/components/Panel';
import { useTopBarControls } from '@renderer/components/TopBarControls';
import { areFormStatesEqual, getErrorMessage } from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';
import { useEntityStore } from '@renderer/store/entityStore';
import { useSidebarStore } from '@renderer/store/sidebarStore';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';

type EventFormState = {
  endTick: string;
  primaryLocationId: string;
  startTick: number;
  summary: string;
  title: string;
};

function createEmptyEventForm(defaultTick: number): EventFormState {
  return {
    title: '',
    summary: '',
    startTick: defaultTick,
    endTick: '',
    primaryLocationId: '',
  };
}

function toEventForm(event: Event): EventFormState {
  return {
    title: event.title,
    summary: event.summary,
    startTick: event.startTick,
    endTick: event.endTick === null ? '' : String(event.endTick),
    primaryLocationId: event.primaryLocationId === null ? '' : String(event.primaryLocationId),
  };
}

function toEventPayload(form: EventFormState) {
  return {
    title: form.title,
    summary: form.summary,
    startTick: form.startTick,
    endTick: form.endTick === '' ? null : Number(form.endTick),
    primaryLocationId: form.primaryLocationId === '' ? null : Number(form.primaryLocationId),
  };
}

function getEventStatus(event: Event, tick: number): TemporalDetailStatus {
  if (tick < event.startTick) {
    return 'notYetCreated';
  }

  if (event.endTick !== null && tick > event.endTick) {
    return 'ended';
  }

  return 'active';
}

function describeEventStatus(status: TemporalDetailStatus, tick: number): string {
  switch (status) {
    case 'missing':
      return 'Select an event to review it.';
    case 'notYetCreated':
      return `This event has not started by ${formatWorldTick(tick)}.`;
    case 'ended':
      return `This event has already concluded by ${formatWorldTick(tick)}.`;
    default:
      return '';
  }
}

function getDiscardMessage(mode: WorkspaceMode): string {
  return mode === 'create'
    ? 'Discard this new event draft?'
    : 'Discard unsaved changes to this event?';
}

export function EventPage() {
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { selectedEventId, setSelectedEventId } = useEntityStore();
  const loadSidebarData = useSidebarStore((state) => state.loadSidebarData);
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

  const [mode, setMode] = useState<WorkspaceMode>('browse');
  const [events, setEvents] = useState<Event[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventStatus, setSelectedEventStatus] = useState<TemporalDetailStatus>('missing');
  const [createForm, setCreateForm] = useState<EventFormState>(createEmptyEventForm(committedTick));
  const [editForm, setEditForm] = useState<EventFormState>(createEmptyEventForm(committedTick));
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const reloadEvents = useCallback(async (): Promise<Event[]> => {
    const nextEvents = await window.worldForge.listEvents();
    setEvents(nextEvents);
    return nextEvents;
  }, []);

  const reloadEventDetail = useCallback(
    async (eventId: number, asOfTick: number, sourceEvents: Event[] = events) => {
      const detail = await window.worldForge.getEvent({
        id: eventId,
        asOfTick,
      });

      setSelectedEventStatus(detail.status);
      setSelectedEvent(detail.record);

      const sourceEvent = detail.record ?? sourceEvents.find((event) => event.id === eventId) ?? null;
      setEditForm(sourceEvent ? toEventForm(sourceEvent) : createEmptyEventForm(committedTick));
    },
    [committedTick, events],
  );

  useEffect(() => {
    setCreateForm((current) => ({ ...current, startTick: committedTick }));
  }, [committedTick]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [nextEvents, nextLocations] = await Promise.all([
          window.worldForge.listEvents(),
          window.worldForge.listLocations({ asOfTick: tick }),
        ]);

        setEvents(nextEvents);
        setLocations(nextLocations);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [setErrorMessage, tick]);

  useEffect(() => {
    async function loadDetail() {
      if (selectedEventId === null) {
        setSelectedEvent(null);
        setSelectedEventStatus('missing');
        return;
      }

      setIsLoadingDetail(true);
      setErrorMessage(null);

      try {
        await reloadEventDetail(selectedEventId, tick);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoadingDetail(false);
      }
    }

    void loadDetail();
  }, [reloadEventDetail, selectedEventId, setErrorMessage, tick]);

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => right.startTick - left.startTick || right.id - left.id),
    [events],
  );
  const selectedEventSource = useMemo(
    () => selectedEvent ?? events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEvent, selectedEventId],
  );
  const createBaseline = useMemo(() => createEmptyEventForm(committedTick), [committedTick]);
  const editBaseline = useMemo(
    () => (selectedEventSource ? toEventForm(selectedEventSource) : createEmptyEventForm(committedTick)),
    [committedTick, selectedEventSource],
  );
  const isDirty =
    mode === 'create'
      ? !areFormStatesEqual(createForm, createBaseline)
      : mode === 'edit'
        ? !areFormStatesEqual(editForm, editBaseline)
        : false;
  const isSavingEvent = isCreating || isUpdating || isDeleting;
  const activeForm = mode === 'create' ? createForm : editForm;

  const confirmEventNavigation = useCallback(() => {
    if (!isDirty) {
      return true;
    }

    return window.confirm(getDiscardMessage(mode));
  }, [isDirty, mode]);

  const handleSelectEvent = useCallback(
    (eventId: number) => {
      if (eventId === selectedEventId) {
        return;
      }

      if (!confirmEventNavigation()) {
        return;
      }

      setSelectedEventId(eventId);
      setMode('browse');
    },
    [confirmEventNavigation, selectedEventId, setSelectedEventId],
  );

  const handleStartCreate = useCallback(() => {
    if (!confirmEventNavigation()) {
      return;
    }

    setCreateForm(createEmptyEventForm(committedTick));
    setMode('create');
  }, [committedTick, confirmEventNavigation]);

  const handleStartEdit = useCallback(() => {
    if (selectedEventId === null || selectedEventStatus !== 'active' || !selectedEventSource) {
      return;
    }

    if (!confirmEventNavigation()) {
      return;
    }

    setEditForm(toEventForm(selectedEventSource));
    setMode('edit');
  }, [
    confirmEventNavigation,
    selectedEventId,
    selectedEventSource,
    selectedEventStatus,
  ]);

  const handleCancelMode = useCallback(() => {
    if (mode === 'create') {
      setCreateForm(createEmptyEventForm(committedTick));
    } else if (mode === 'edit') {
      setEditForm(editBaseline);
    }

    setMode('browse');
  }, [committedTick, editBaseline, mode]);

  const handleCreateEvent = useCallback(async () => {
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createEvent(toEventPayload(createForm));
      setSelectedEventId(created.id);
      setCreateForm(createEmptyEventForm(committedTick));

      await refreshTimeline();
      const nextEvents = await reloadEvents();
      await Promise.all([
        loadSidebarData(committedTick),
        reloadEventDetail(created.id, tick, nextEvents),
      ]);

      setMode('edit');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }, [
    committedTick,
    createForm,
    loadSidebarData,
    refreshTimeline,
    reloadEventDetail,
    reloadEvents,
    setErrorMessage,
    setSelectedEventId,
    tick,
  ]);

  const handleUpdateEvent = useCallback(async () => {
    if (selectedEventId === null) {
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      await window.worldForge.updateEvent({
        id: selectedEventId,
        ...toEventPayload(editForm),
      });

      await refreshTimeline();
      const nextEvents = await reloadEvents();
      await Promise.all([
        loadSidebarData(committedTick),
        reloadEventDetail(selectedEventId, tick, nextEvents),
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }, [
    committedTick,
    editForm,
    loadSidebarData,
    refreshTimeline,
    reloadEventDetail,
    reloadEvents,
    selectedEventId,
    setErrorMessage,
    tick,
  ]);

  const handleDeleteEvent = useCallback(async () => {
    if (selectedEventId === null || isDeleting) {
      return;
    }

    if (!window.confirm('Delete this event?')) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await window.worldForge.deleteEvent({ id: selectedEventId });
      setSelectedEventId(null);
      setSelectedEvent(null);

      await refreshTimeline();
      await Promise.all([
        reloadEvents(),
        loadSidebarData(committedTick),
      ]);

      setSelectedEventStatus('missing');
      setEditForm(createEmptyEventForm(committedTick));
      setMode('browse');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }, [
    committedTick,
    isDeleting,
    loadSidebarData,
    refreshTimeline,
    reloadEvents,
    selectedEventId,
    setErrorMessage,
    setSelectedEventId,
  ]);

  const handleSaveEvent = useCallback(async () => {
    if (mode === 'create') {
      await handleCreateEvent();
      return;
    }

    if (mode === 'edit') {
      await handleUpdateEvent();
    }
  }, [handleCreateEvent, handleUpdateEvent, mode]);

  const canEditEvent =
    selectedEventId !== null &&
    selectedEventStatus === 'active' &&
    !isLoadingDetail;
  const canSaveEvent =
    mode === 'create'
      ? createForm.title.trim().length > 0
      : mode === 'edit'
        ? selectedEventId !== null && editForm.title.trim().length > 0
        : false;

  const topBarConfig = useMemo(
    () => ({
      actions: [
        {
          id: 'add-event',
          label: 'Add',
          onSelect: handleStartCreate,
          variant: 'primary' as const,
          visible: mode === 'browse',
        },
        {
          id: 'edit-event',
          label: 'Edit',
          onSelect: handleStartEdit,
          variant: 'secondary' as const,
          disabled: !canEditEvent,
          visible: mode === 'browse',
        },
        {
          id: 'save-event',
          label: isCreating ? 'Creating...' : isUpdating ? 'Saving...' : 'Save',
          onSelect: handleSaveEvent,
          variant: 'primary' as const,
          disabled: !canSaveEvent || isSavingEvent,
          visible: mode !== 'browse',
        },
        {
          id: 'cancel-event',
          label: 'Cancel',
          onSelect: handleCancelMode,
          variant: 'secondary' as const,
          disabled: isSavingEvent,
          visible: mode !== 'browse',
        },
        {
          id: 'delete-event',
          label: isDeleting ? 'Deleting...' : 'Delete',
          onSelect: handleDeleteEvent,
          variant: 'danger' as const,
          disabled: !canEditEvent || isSavingEvent,
          visible: mode === 'edit',
        },
      ],
      confirmNavigation: confirmEventNavigation,
      isBusy: isLoadingDetail || isSavingEvent,
      modeLabel:
        mode === 'create'
          ? 'Creating Event'
          : mode === 'edit'
            ? 'Editing Event'
            : 'Browsing Events',
      selectionLabel: selectedEventSource
        ? `Event: ${selectedEventSource.title}`
        : selectedEventId === null
          ? 'No event selected'
          : undefined,
    }),
    [
      canEditEvent,
      canSaveEvent,
      confirmEventNavigation,
      handleCancelMode,
      handleDeleteEvent,
      handleSaveEvent,
      handleStartCreate,
      handleStartEdit,
      isCreating,
      isDeleting,
      isLoadingDetail,
      isSavingEvent,
      isUpdating,
      mode,
      selectedEventId,
      selectedEventSource,
    ],
  );

  useTopBarControls(topBarConfig);

  return (
    <main className="content-grid">
      <Panel title="Event Index">
        <p className="muted helper-text">
          Chronology stays independent from state changes, but map features can still cite an event as their source.
        </p>

        {isLoading ? <p className="muted">Loading events...</p> : null}

        <ul className="entity-list">
          {sortedEvents.map((eventRecord) => {
            const status = getEventStatus(eventRecord, tick);
            const isActive = selectedEventId === eventRecord.id;

            return (
              <li key={eventRecord.id}>
                <button
                  className={isActive ? 'entity-list-item active' : 'entity-list-item'}
                  onClick={() => {
                    handleSelectEvent(eventRecord.id);
                  }}
                  type="button"
                >
                  <div className="entity-list-heading">
                    <strong>{eventRecord.title}</strong>
                    <div className="entity-list-pills">
                      <span className="pill small">{status}</span>
                    </div>
                  </div>
                  <span>{formatWorldTick(eventRecord.startTick)}</span>
                  <span>{eventRecord.primaryLocation?.name ?? 'No primary place'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        badge={selectedEventSource ? <span className="pill">#{selectedEventSource.id}</span> : null}
        className="details-panel"
        title={mode === 'create' ? 'Create Event' : 'Selected Event'}
      >
        {mode === 'create' ? (
          <form
            aria-busy={isCreating}
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveEvent();
            }}
          >
            <label>
              <span>Title</span>
              <input
                onChange={(event) => {
                  setCreateForm((current) => ({ ...current, title: event.target.value }));
                }}
                placeholder="Treaty of Harbor Reach"
                required
                value={activeForm.title}
              />
            </label>

            <label>
              <span>Summary</span>
              <textarea
                onChange={(event) => {
                  setCreateForm((current) => ({ ...current, summary: event.target.value }));
                }}
                rows={6}
                value={activeForm.summary}
              />
            </label>

            <label>
              <span>Start Tick</span>
              <input
                min={0}
                onChange={(event) => {
                  setCreateForm((current) => ({
                    ...current,
                    startTick: Number(event.target.value) || 0,
                  }));
                }}
                type="number"
                value={activeForm.startTick}
              />
            </label>

            <label>
              <span>End Tick</span>
              <input
                min={0}
                onChange={(event) => {
                  setCreateForm((current) => ({ ...current, endTick: event.target.value }));
                }}
                placeholder="Optional"
                type="number"
                value={activeForm.endTick}
              />
            </label>

            <label>
              <span>Primary Place</span>
              <select
                onChange={(event) => {
                  setCreateForm((current) => ({
                    ...current,
                    primaryLocationId: event.target.value,
                  }));
                }}
                value={activeForm.primaryLocationId}
              >
                <option value="">No primary place</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>

            <p className="muted helper-text">
              Use the top bar to save or cancel this new event.
            </p>
          </form>
        ) : (
          <>
            {selectedEventId === null || selectedEventStatus !== 'active' ? (
              <p className="muted">{describeEventStatus(selectedEventStatus, tick)}</p>
            ) : null}
            {selectedEventId !== null && isLoadingDetail ? (
              <p className="muted">Loading event details...</p>
            ) : null}

            {selectedEventSource ? (
              <>
                <dl className="detail-grid">
                  <div>
                    <dt>Starts</dt>
                    <dd>{formatWorldTick(selectedEventSource.startTick)}</dd>
                  </div>
                  <div>
                    <dt>Ends</dt>
                    <dd>
                      {selectedEventSource.endTick === null
                        ? 'Open-ended'
                        : formatWorldTick(selectedEventSource.endTick)}
                    </dd>
                  </div>
                </dl>

                {mode === 'edit' ? (
                  <form
                    aria-busy={isUpdating}
                    className="form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSaveEvent();
                    }}
                  >
                    <label>
                      <span>Title</span>
                      <input
                        onChange={(event) => {
                          setEditForm((current) => ({ ...current, title: event.target.value }));
                        }}
                        required
                        value={activeForm.title}
                      />
                    </label>

                    <label>
                      <span>Summary</span>
                      <textarea
                        onChange={(event) => {
                          setEditForm((current) => ({ ...current, summary: event.target.value }));
                        }}
                        rows={6}
                        value={activeForm.summary}
                      />
                    </label>

                    <label>
                      <span>Start Tick</span>
                      <input
                        min={0}
                        onChange={(event) => {
                          setEditForm((current) => ({
                            ...current,
                            startTick: Number(event.target.value) || 0,
                          }));
                        }}
                        type="number"
                        value={activeForm.startTick}
                      />
                    </label>

                    <label>
                      <span>End Tick</span>
                      <input
                        min={0}
                        onChange={(event) => {
                          setEditForm((current) => ({ ...current, endTick: event.target.value }));
                        }}
                        placeholder="Optional"
                        type="number"
                        value={activeForm.endTick}
                      />
                    </label>

                    <label>
                      <span>Primary Place</span>
                      <select
                        onChange={(event) => {
                          setEditForm((current) => ({
                            ...current,
                            primaryLocationId: event.target.value,
                          }));
                        }}
                        value={activeForm.primaryLocationId}
                      >
                        <option value="">No primary place</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <p className="muted helper-text">
                      Use the top bar to save, cancel, or delete this event.
                    </p>
                  </form>
                ) : (
                  <p className="muted helper-text">
                    Use the top bar to edit or delete this event.
                  </p>
                )}

                <EntityLinksPanel
                  entityId={selectedEventId}
                  entityKind="event"
                  emptyMessage="Select an event to manage its linked files."
                  title="Event Links"
                />
              </>
            ) : null}
          </>
        )}
      </Panel>
    </main>
  );
}
