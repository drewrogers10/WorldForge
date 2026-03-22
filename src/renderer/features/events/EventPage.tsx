import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { EntityLinksPanel } from '@renderer/components/EntityLinksPanel';
import { Panel } from '@renderer/components/Panel';
import { getErrorMessage } from '@renderer/lib/forms';
import { useEntityStore } from '@renderer/store/entityStore';
import { useSidebarStore } from '@renderer/store/sidebarStore';
import { useTemporalStore } from '@renderer/store/temporalStore';
import { useUiStore } from '@renderer/store/uiStore';
import type { Event } from '@shared/event';
import { formatWorldTick, type TemporalDetailStatus } from '@shared/temporal';
import type { Location } from '@shared/location';

type EventFormState = {
  title: string;
  summary: string;
  startTick: number;
  endTick: string;
  primaryLocationId: string;
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

export function EventPage() {
  const { committedTick, previewTick, refreshTimeline } = useTemporalStore();
  const tick = previewTick ?? committedTick;
  const { selectedEventId, setSelectedEventId } = useEntityStore();
  const loadSidebarData = useSidebarStore((state) => state.loadSidebarData);
  const setErrorMessage = useUiStore((state) => state.setErrorMessage);

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
        const detail = await window.worldForge.getEvent({
          id: selectedEventId,
          asOfTick: tick,
        });
        setSelectedEventStatus(detail.status);
        setSelectedEvent(detail.record);

        const sourceEvent =
          detail.record ?? events.find((event) => event.id === selectedEventId) ?? null;

        if (sourceEvent) {
          setEditForm(toEventForm(sourceEvent));
        } else {
          setEditForm(createEmptyEventForm(committedTick));
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoadingDetail(false);
      }
    }

    void loadDetail();
  }, [committedTick, events, selectedEventId, setErrorMessage, tick]);

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => right.startTick - left.startTick || right.id - left.id),
    [events],
  );

  async function reloadEvents() {
    const nextEvents = await window.worldForge.listEvents();
    setEvents(nextEvents);
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const created = await window.worldForge.createEvent(toEventPayload(createForm));
      setSelectedEventId(created.id);
      setCreateForm(createEmptyEventForm(committedTick));
      await refreshTimeline();
      await Promise.all([
        reloadEvents(),
        loadSidebarData(committedTick),
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      await Promise.all([
        reloadEvents(),
        loadSidebarData(committedTick),
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteEvent() {
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
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

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
                    setSelectedEventId(eventRecord.id);
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
        badge={selectedEvent ? <span className="pill">#{selectedEvent.id}</span> : null}
        className="details-panel"
        title="Selected Event"
      >
        {selectedEventId === null || selectedEventStatus !== 'active' ? (
          <p className="muted">{describeEventStatus(selectedEventStatus, tick)}</p>
        ) : null}
        {selectedEventId !== null && isLoadingDetail ? (
          <p className="muted">Loading event details...</p>
        ) : null}

        {selectedEventId !== null ? (
          <>
            {selectedEvent ?? events.find((event) => event.id === selectedEventId) ? (
              <>
                <dl className="detail-grid">
                  <div>
                    <dt>Starts</dt>
                    <dd>{formatWorldTick((selectedEvent ?? events.find((item) => item.id === selectedEventId))!.startTick)}</dd>
                  </div>
                  <div>
                    <dt>Ends</dt>
                    <dd>
                      {(selectedEvent ?? events.find((item) => item.id === selectedEventId))!.endTick === null
                        ? 'Open-ended'
                        : formatWorldTick((selectedEvent ?? events.find((item) => item.id === selectedEventId))!.endTick!)}
                    </dd>
                  </div>
                </dl>

                <form className="form" onSubmit={handleUpdateEvent}>
                  <label>
                    <span>Title</span>
                    <input
                      onChange={(event) => {
                        setEditForm((current) => ({ ...current, title: event.target.value }));
                      }}
                      required
                      value={editForm.title}
                    />
                  </label>

                  <label>
                    <span>Summary</span>
                    <textarea
                      onChange={(event) => {
                        setEditForm((current) => ({ ...current, summary: event.target.value }));
                      }}
                      rows={6}
                      value={editForm.summary}
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
                      value={editForm.startTick}
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
                      value={editForm.endTick}
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
                      value={editForm.primaryLocationId}
                    >
                      <option value="">No primary place</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="button-row">
                    <button disabled={isUpdating} type="submit">
                      {isUpdating ? 'Saving...' : 'Save Event'}
                    </button>
                    <button
                      className="danger-button"
                      disabled={isDeleting || isUpdating}
                      onClick={() => {
                        void handleDeleteEvent();
                      }}
                      type="button"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Event'}
                    </button>
                  </div>
                </form>

                <EntityLinksPanel
                  entityId={selectedEventId}
                  entityKind="event"
                  emptyMessage="Select an event to manage its linked files."
                  title="Event Links"
                />
              </>
            ) : null}
          </>
        ) : null}
      </Panel>

      <Panel title="Create Event">
        <form className="form" onSubmit={handleCreateEvent}>
          <label>
            <span>Title</span>
            <input
              onChange={(event) => {
                setCreateForm((current) => ({ ...current, title: event.target.value }));
              }}
              placeholder="Treaty of Harbor Reach"
              required
              value={createForm.title}
            />
          </label>

          <label>
            <span>Summary</span>
            <textarea
              onChange={(event) => {
                setCreateForm((current) => ({ ...current, summary: event.target.value }));
              }}
              rows={6}
              value={createForm.summary}
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
              value={createForm.startTick}
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
              value={createForm.endTick}
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
              value={createForm.primaryLocationId}
            >
              <option value="">No primary place</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <button disabled={isCreating} type="submit">
            {isCreating ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </Panel>
    </main>
  );
}
