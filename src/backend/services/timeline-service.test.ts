import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabaseContext } from '@db/test-utils';
import { formatWorldTick } from '@shared/temporal';
import { createCharacterService } from './character-service';
import { createLocationService } from './location-service';
import { createTimelineService } from './timeline-service';

type TestDatabaseContext = ReturnType<typeof createTestDatabaseContext>;

describe('timeline service', () => {
  let context: TestDatabaseContext | undefined;

  beforeEach(() => {
    context = createTestDatabaseContext();
  });

  afterEach(() => {
    context?.cleanup();
    context = undefined;
  });

  it('returns timeline bounds and change anchors from temporal writes', () => {
    const locationService = createLocationService(context!.db);
    const characterService = createCharacterService(context!.db);
    const timelineService = createTimelineService(context!.db);

    const harbor = locationService.createLocation({
      name: 'Harbor Reach',
      summary: 'A busy port district.',
      effectiveTick: 10,
    });

    const scribe = characterService.createCharacter({
      name: 'Caro Fen',
      summary: 'Port registrar.',
      locationId: harbor.id,
      effectiveTick: 15,
    });

    characterService.updateCharacter({
      id: scribe.id,
      name: 'Caro Fen',
      summary: 'Harbor registrar.',
      locationId: null,
      effectiveTick: 25,
    });

    characterService.deleteCharacter({
      id: scribe.id,
      effectiveTick: 40,
    });

    expect(timelineService.getTimelineBounds()).toEqual({
      minTick: 10,
      maxTick: 40,
      presentTick: 40,
    });

    expect(timelineService.listTimelineAnchors()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tick: 10, label: formatWorldTick(10, 'short') }),
        expect.objectContaining({ tick: 15, label: formatWorldTick(15, 'short') }),
        expect.objectContaining({ tick: 25, label: formatWorldTick(25, 'short') }),
        expect.objectContaining({ tick: 40, label: formatWorldTick(40, 'short') }),
      ]),
    );
  });
});
