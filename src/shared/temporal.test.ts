import { describe, expect, it } from 'vitest';
import {
  formatWorldTick,
  getTimelinePosition,
  getWorldTickFromPosition,
  temporalCalendarUnits,
} from './temporal';

describe('temporal calendar helpers', () => {
  it('formats ticks with 4-week months and 12-month years', () => {
    expect(formatWorldTick(0)).toBe('Year 1, Month 1, Week 1, Day 1 · 00:00');
    expect(formatWorldTick(10, 'short')).toBe('Y1 M1 W1 D1 · 00:10');
    expect(formatWorldTick(temporalCalendarUnits.month)).toBe(
      'Year 1, Month 2, Week 1, Day 1 · 00:00',
    );
    expect(formatWorldTick(temporalCalendarUnits.year)).toBe(
      'Year 2, Month 1, Week 1, Day 1 · 00:00',
    );
  });

  it('round-trips timeline positions to exact minute ticks', () => {
    const position = {
      year: 3,
      month: 12,
      week: 4,
      day: 7,
      hour: 23,
      minute: 59,
    } as const;

    const tick = getWorldTickFromPosition(position);

    expect(getTimelinePosition(tick)).toEqual(position);
  });
});
