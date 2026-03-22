import { describe, expect, it } from 'vitest';
import {
  createDefaultLayerVisibility,
  createEditorHistory,
  filterVisibleFeatures,
  insertGeometryPoint,
  pushEditorHistory,
  redoEditorHistory,
  removeGeometryPoint,
  snapPointToGrid,
  undoEditorHistory,
} from './mapEditorState';

describe('mapEditorState', () => {
  it('snaps points to the configured grid size', () => {
    expect(snapPointToGrid({ x: 151, y: 349 }, 100)).toEqual({
      x: 200,
      y: 300,
    });
  });

  it('supports undo and redo for editor snapshots', () => {
    const initial = createEditorHistory();
    const withDraft = pushEditorHistory(initial, {
      draftPoints: [{ x: 10, y: 20 }],
      liveGeometry: null,
      selectedFeatureId: null,
      selectedVertexIndex: null,
    });

    expect(withDraft.present.draftPoints).toHaveLength(1);
    expect(undoEditorHistory(withDraft).present.draftPoints).toEqual([]);
    expect(redoEditorHistory(undoEditorHistory(withDraft)).present.draftPoints).toEqual([
      { x: 10, y: 20 },
    ]);
  });

  it('inserts and removes geometry points while respecting minimum counts', () => {
    const pathGeometry = {
      type: 'path' as const,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    };
    const polygonGeometry = {
      type: 'polygon' as const,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
    };

    expect(insertGeometryPoint(pathGeometry, { x: 50, y: 10 })).toEqual({
      type: 'path',
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 10 },
        { x: 100, y: 0 },
      ],
    });
    expect(removeGeometryPoint(polygonGeometry, 1)).toBeNull();
    expect(
      removeGeometryPoint(
        {
          type: 'path',
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 10 },
            { x: 100, y: 0 },
          ],
        },
        1,
      ),
    ).toEqual({
      type: 'path',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
  });

  it('filters rendered features based on layer visibility', () => {
    const visibility = createDefaultLayerVisibility();
    visibility.road = false;

    expect(
      filterVisibleFeatures(
        [
          {
            id: 1,
            mapId: 2,
            featureKind: 'path',
            featureRole: 'road',
            locationId: null,
            location: null,
            eventId: null,
            event: null,
            label: 'North Road',
            geometry: {
              type: 'path',
              points: [
                { x: 0, y: 0 },
                { x: 100, y: 100 },
              ],
            },
            style: null,
            sourceEventId: null,
            sourceEvent: null,
            validFrom: 0,
            validTo: null,
            createdAt: '2026-03-22T00:00:00.000Z',
            updatedAt: '2026-03-22T00:00:00.000Z',
          },
          {
            id: 2,
            mapId: 2,
            featureKind: 'marker',
            featureRole: 'settlement',
            locationId: null,
            location: null,
            eventId: null,
            event: null,
            label: 'Westgate',
            geometry: {
              type: 'marker',
              point: { x: 200, y: 300 },
            },
            style: null,
            sourceEventId: null,
            sourceEvent: null,
            validFrom: 0,
            validTo: null,
            createdAt: '2026-03-22T00:00:00.000Z',
            updatedAt: '2026-03-22T00:00:00.000Z',
          },
        ],
        visibility,
      ).map((feature) => feature.id),
    ).toEqual([2]);
  });
});
