import type { AppDatabase } from '@db/client';
import {
  getTimelineBounds,
  listTimelineAnchors,
} from '@db/queries/temporal';

export function createTimelineService(db: AppDatabase) {
  return {
    getTimelineBounds() {
      return getTimelineBounds(db);
    },
    listTimelineAnchors() {
      return listTimelineAnchors(db);
    },
  };
}

export type TimelineService = ReturnType<typeof createTimelineService>;
