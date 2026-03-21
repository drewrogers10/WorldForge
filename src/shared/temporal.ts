import { z, type ZodTypeAny } from 'zod';

export const worldTickSchema = z.number().int().min(0);

export const temporalCalendar = {
  minutesPerHour: 60,
  hoursPerDay: 24,
  daysPerWeek: 7,
  weeksPerMonth: 4,
  monthsPerYear: 12,
} as const;

export const temporalCalendarUnits = {
  minute: 1,
  hour: temporalCalendar.minutesPerHour,
  day: temporalCalendar.minutesPerHour * temporalCalendar.hoursPerDay,
  week:
    temporalCalendar.minutesPerHour *
    temporalCalendar.hoursPerDay *
    temporalCalendar.daysPerWeek,
  month:
    temporalCalendar.minutesPerHour *
    temporalCalendar.hoursPerDay *
    temporalCalendar.daysPerWeek *
    temporalCalendar.weeksPerMonth,
  year:
    temporalCalendar.minutesPerHour *
    temporalCalendar.hoursPerDay *
    temporalCalendar.daysPerWeek *
    temporalCalendar.weeksPerMonth *
    temporalCalendar.monthsPerYear,
} as const;

export type TimelinePosition = {
  year: number;
  month: number;
  week: number;
  day: number;
  hour: number;
  minute: number;
};

export type WorldTickFormatStyle = 'long' | 'short';

export const asOfInputSchema = z.object({
  asOfTick: worldTickSchema.optional(),
});

export const effectiveTickSchema = worldTickSchema;

export const timelineBoundsSchema = z.object({
  minTick: worldTickSchema,
  maxTick: worldTickSchema,
  presentTick: worldTickSchema,
});

export const timelineAnchorSchema = z.object({
  tick: worldTickSchema,
  label: z.string().min(1),
  changeCount: z.number().int().nonnegative(),
});

export const temporalDetailStatusSchema = z.enum([
  'active',
  'notYetCreated',
  'ended',
  'missing',
]);

export function createTemporalDetailSchema<TRecord extends ZodTypeAny>(
  recordSchema: TRecord,
) {
  return z.object({
    status: temporalDetailStatusSchema,
    record: recordSchema.nullable(),
  });
}

function padTime(value: number): string {
  return value.toString().padStart(2, '0');
}

export function getTimelinePosition(tick: number): TimelinePosition {
  let remainder = Math.max(0, Math.floor(tick));

  const year = Math.floor(remainder / temporalCalendarUnits.year) + 1;
  remainder %= temporalCalendarUnits.year;

  const month = Math.floor(remainder / temporalCalendarUnits.month) + 1;
  remainder %= temporalCalendarUnits.month;

  const week = Math.floor(remainder / temporalCalendarUnits.week) + 1;
  remainder %= temporalCalendarUnits.week;

  const day = Math.floor(remainder / temporalCalendarUnits.day) + 1;
  remainder %= temporalCalendarUnits.day;

  const hour = Math.floor(remainder / temporalCalendarUnits.hour);
  const minute = remainder % temporalCalendarUnits.hour;

  return {
    year,
    month,
    week,
    day,
    hour,
    minute,
  };
}

export function getWorldTickFromPosition(position: TimelinePosition): number {
  return (
    (Math.max(1, position.year) - 1) * temporalCalendarUnits.year +
    (Math.max(1, position.month) - 1) * temporalCalendarUnits.month +
    (Math.max(1, position.week) - 1) * temporalCalendarUnits.week +
    (Math.max(1, position.day) - 1) * temporalCalendarUnits.day +
    Math.max(0, position.hour) * temporalCalendarUnits.hour +
    Math.max(0, position.minute)
  );
}

export function formatWorldTick(
  tick: number,
  style: WorldTickFormatStyle = 'long',
): string {
  const position = getTimelinePosition(tick);
  const clock = `${padTime(position.hour)}:${padTime(position.minute)}`;

  if (style === 'short') {
    return `Y${position.year} M${position.month} W${position.week} D${position.day} · ${clock}`;
  }

  return `Year ${position.year}, Month ${position.month}, Week ${position.week}, Day ${position.day} · ${clock}`;
}

export type WorldTick = z.infer<typeof worldTickSchema>;
export type AsOfInput = z.infer<typeof asOfInputSchema>;
export type TimelineBounds = z.infer<typeof timelineBoundsSchema>;
export type TimelineAnchor = z.infer<typeof timelineAnchorSchema>;
export type TemporalDetailStatus = z.infer<typeof temporalDetailStatusSchema>;
export type TemporalDetailResult<TRecord> = {
  status: TemporalDetailStatus;
  record: TRecord | null;
};
