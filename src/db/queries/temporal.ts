import type { AppDatabase } from '../client';
import type { TimelineAnchor, TimelineBounds, TemporalDetailStatus } from '@shared/temporal';

type TemporalExistenceRecord = {
  existsFromTick: number;
  existsToTick: number | null;
};

type BoundsRow = {
  minTick: number | null;
  maxTick: number | null;
};

type AnchorRow = {
  tick: number;
  changeCount: number;
};

export function getTemporalDetailStatus(
  record: TemporalExistenceRecord | undefined,
  tick: number,
): TemporalDetailStatus {
  if (!record) {
    return 'missing';
  }

  if (tick < record.existsFromTick) {
    return 'notYetCreated';
  }

  if (record.existsToTick !== null && tick >= record.existsToTick) {
    return 'ended';
  }

  return 'active';
}

export function getTimelineBounds(db: AppDatabase): TimelineBounds {
  const statement = db.$client.prepare(
    `
      WITH boundary_ticks AS (
        SELECT exists_from_tick AS tick FROM characters
        UNION ALL SELECT exists_to_tick FROM characters WHERE exists_to_tick IS NOT NULL
        UNION ALL SELECT exists_from_tick FROM locations
        UNION ALL SELECT exists_to_tick FROM locations WHERE exists_to_tick IS NOT NULL
        UNION ALL SELECT exists_from_tick FROM items
        UNION ALL SELECT exists_to_tick FROM items WHERE exists_to_tick IS NOT NULL
        UNION ALL SELECT valid_from FROM character_versions
        UNION ALL SELECT valid_to FROM character_versions WHERE valid_to IS NOT NULL
        UNION ALL SELECT valid_from FROM location_versions
        UNION ALL SELECT valid_to FROM location_versions WHERE valid_to IS NOT NULL
        UNION ALL SELECT valid_from FROM item_versions
        UNION ALL SELECT valid_to FROM item_versions WHERE valid_to IS NOT NULL
        UNION ALL SELECT valid_from FROM character_location_spans
        UNION ALL SELECT valid_to FROM character_location_spans WHERE valid_to IS NOT NULL
        UNION ALL SELECT valid_from FROM item_assignment_spans
        UNION ALL SELECT valid_to FROM item_assignment_spans WHERE valid_to IS NOT NULL
      )
      SELECT MIN(tick) AS minTick, MAX(tick) AS maxTick
      FROM boundary_ticks
    `,
  );
  const row = statement.get() as BoundsRow | undefined;
  const minTick = row?.minTick ?? 0;
  const maxTick = row?.maxTick ?? minTick;

  return {
    minTick,
    maxTick,
    presentTick: maxTick,
  };
}

export function listTimelineAnchors(db: AppDatabase): TimelineAnchor[] {
  const statement = db.$client.prepare(
    `
      WITH boundary_ticks AS (
        SELECT exists_from_tick AS tick FROM characters
        UNION ALL SELECT exists_to_tick FROM characters WHERE exists_to_tick IS NOT NULL
        UNION ALL SELECT exists_from_tick FROM locations
        UNION ALL SELECT exists_to_tick FROM locations WHERE exists_to_tick IS NOT NULL
        UNION ALL SELECT exists_from_tick FROM items
        UNION ALL SELECT exists_to_tick FROM items WHERE exists_to_tick IS NOT NULL
        UNION ALL SELECT valid_from FROM character_versions
        UNION ALL SELECT valid_to FROM character_versions WHERE valid_to IS NOT NULL
        UNION ALL SELECT valid_from FROM location_versions
        UNION ALL SELECT valid_to FROM location_versions WHERE valid_to IS NOT NULL
        UNION ALL SELECT valid_from FROM item_versions
        UNION ALL SELECT valid_to FROM item_versions WHERE valid_to IS NOT NULL
        UNION ALL SELECT valid_from FROM character_location_spans
        UNION ALL SELECT valid_to FROM character_location_spans WHERE valid_to IS NOT NULL
        UNION ALL SELECT valid_from FROM item_assignment_spans
        UNION ALL SELECT valid_to FROM item_assignment_spans WHERE valid_to IS NOT NULL
      )
      SELECT tick, COUNT(*) AS changeCount
      FROM boundary_ticks
      GROUP BY tick
      ORDER BY tick
    `,
  );

  return (statement.all() as AnchorRow[]).map((row) => ({
    tick: row.tick,
    label: `Tick ${row.tick}`,
    changeCount: row.changeCount,
  }));
}
