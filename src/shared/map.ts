import { z } from 'zod';
import { eventReferenceSchema } from './event';
import { locationReferenceSchema } from './location';
import { effectiveTickSchema, worldTickSchema } from './temporal';

const mapIdSchema = z.number().int().positive();
const coordinateSchema = z.number().int().min(0).max(10000);
const mapNameSchema = z.string().trim().min(1).max(160);
const displayKindSchema = z.enum(['vector', 'image']);
const featureKindSchema = z.enum(['marker', 'path', 'polygon', 'border']);
const nullableLocationIdSchema = z.number().int().positive().nullable();
const nullableMapIdSchema = z.number().int().positive().nullable();
const nullableEventIdSchema = z.number().int().positive().nullable();

const coordinatePointSchema = z.object({
  x: coordinateSchema,
  y: coordinateSchema,
});

export const mapReferenceSchema = z.object({
  id: mapIdSchema,
  name: mapNameSchema,
  displayKind: displayKindSchema,
});

export const mapGeometrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('marker'),
    point: coordinatePointSchema,
  }),
  z.object({
    type: z.literal('path'),
    points: z.array(coordinatePointSchema).min(2),
  }),
  z.object({
    type: z.literal('polygon'),
    points: z.array(coordinatePointSchema).min(3),
  }),
  z.object({
    type: z.literal('border'),
    points: z.array(coordinatePointSchema).min(3),
  }),
]);

export const mapStyleSchema = z.object({
  stroke: z.string().trim().min(1).max(32).optional(),
  fill: z.string().trim().min(1).max(32).optional(),
  strokeWidth: z.number().min(1).max(128).optional(),
  opacity: z.number().min(0).max(1).optional(),
  markerSize: z.number().min(1).max(512).optional(),
});

export const mapSchema = z.object({
  id: mapIdSchema,
  name: mapNameSchema,
  displayKind: displayKindSchema,
  focusLocationId: nullableLocationIdSchema,
  focusLocation: locationReferenceSchema.nullable(),
  parentMapId: nullableMapIdSchema,
  parentMap: mapReferenceSchema.nullable(),
  imageAssetPath: z.string().trim().min(1).max(4000).nullable(),
  canvasWidth: z.number().int().positive(),
  canvasHeight: z.number().int().positive(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const mapFeatureSchema = z.object({
  id: mapIdSchema,
  mapId: mapIdSchema,
  featureKind: featureKindSchema,
  locationId: nullableLocationIdSchema,
  location: locationReferenceSchema.nullable(),
  eventId: nullableEventIdSchema,
  event: eventReferenceSchema.nullable(),
  label: z.string().trim().max(160),
  geometry: mapGeometrySchema,
  style: mapStyleSchema.nullable(),
  sourceEventId: nullableEventIdSchema,
  sourceEvent: eventReferenceSchema.nullable(),
  validFrom: worldTickSchema,
  validTo: worldTickSchema.nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const mapAnchorSchema = z.object({
  id: mapIdSchema,
  mapId: mapIdSchema,
  locationId: z.number().int().positive(),
  location: locationReferenceSchema,
  x: coordinateSchema,
  y: coordinateSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const listMapFeaturesInputSchema = z.object({
  mapId: mapIdSchema,
  asOfTick: worldTickSchema.optional(),
});

export const listMapAnchorsInputSchema = z.object({
  mapId: mapIdSchema,
});

export const getMapInputSchema = z.object({
  id: mapIdSchema,
});

export const createMapInputSchema = z.object({
  name: mapNameSchema,
  displayKind: displayKindSchema,
  focusLocationId: nullableLocationIdSchema,
  parentMapId: nullableMapIdSchema,
  imageAssetPath: z.string().trim().max(4000).nullable(),
  canvasWidth: z.number().int().positive(),
  canvasHeight: z.number().int().positive(),
}).refine(
  (value) => value.displayKind === 'image' || value.imageAssetPath === null || value.imageAssetPath === '',
  {
    message: 'Vector maps should not define an image asset path.',
    path: ['imageAssetPath'],
  },
);

export const updateMapInputSchema = createMapInputSchema.extend({
  id: mapIdSchema,
});

export const createMapFeatureInputSchema = z.object({
  mapId: mapIdSchema,
  featureKind: featureKindSchema,
  locationId: nullableLocationIdSchema,
  eventId: nullableEventIdSchema,
  label: z.string().trim().max(160),
  geometry: mapGeometrySchema,
  style: mapStyleSchema.nullable(),
  sourceEventId: nullableEventIdSchema,
  effectiveTick: effectiveTickSchema,
}).refine((value) => value.geometry.type === value.featureKind, {
  message: 'Feature kind must match geometry type.',
  path: ['geometry'],
});

export const updateMapFeatureVersionInputSchema = createMapFeatureInputSchema.extend({
  id: mapIdSchema,
});

export const deleteMapFeatureInputSchema = z.object({
  id: mapIdSchema,
  effectiveTick: effectiveTickSchema,
});

export const upsertMapAnchorInputSchema = z.object({
  mapId: mapIdSchema,
  locationId: z.number().int().positive(),
  x: coordinateSchema,
  y: coordinateSchema,
});

export const deleteMapAnchorInputSchema = z.object({
  id: mapIdSchema,
});

export type MapReference = z.infer<typeof mapReferenceSchema>;
export type MapGeometry = z.infer<typeof mapGeometrySchema>;
export type MapStyle = z.infer<typeof mapStyleSchema>;
export type MapRecord = z.infer<typeof mapSchema>;
export type MapFeature = z.infer<typeof mapFeatureSchema>;
export type MapAnchor = z.infer<typeof mapAnchorSchema>;
export type ListMapFeaturesInput = z.infer<typeof listMapFeaturesInputSchema>;
export type ListMapAnchorsInput = z.infer<typeof listMapAnchorsInputSchema>;
export type GetMapInput = z.infer<typeof getMapInputSchema>;
export type CreateMapInput = z.infer<typeof createMapInputSchema>;
export type UpdateMapInput = z.infer<typeof updateMapInputSchema>;
export type CreateMapFeatureInput = z.infer<typeof createMapFeatureInputSchema>;
export type UpdateMapFeatureVersionInput = z.infer<typeof updateMapFeatureVersionInputSchema>;
export type DeleteMapFeatureInput = z.infer<typeof deleteMapFeatureInputSchema>;
export type UpsertMapAnchorInput = z.infer<typeof upsertMapAnchorInputSchema>;
export type DeleteMapAnchorInput = z.infer<typeof deleteMapAnchorInputSchema>;
