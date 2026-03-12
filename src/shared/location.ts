import { z } from 'zod';

const locationIdSchema = z.number().int().positive();
const locationNameSchema = z.string().trim().min(1).max(120);
const locationSummarySchema = z.string().trim().max(4000);

export const locationReferenceSchema = z.object({
  id: locationIdSchema,
  name: locationNameSchema,
});

export const locationSchema = z.object({
  id: locationIdSchema,
  name: locationNameSchema,
  summary: locationSummarySchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const getLocationInputSchema = z.object({
  id: locationIdSchema,
});

export const createLocationInputSchema = z.object({
  name: locationNameSchema,
  summary: locationSummarySchema,
});

export const updateLocationInputSchema = z.object({
  id: locationIdSchema,
  name: locationNameSchema,
  summary: locationSummarySchema,
});

export const deleteLocationInputSchema = getLocationInputSchema;

export type LocationReference = z.infer<typeof locationReferenceSchema>;
export type Location = z.infer<typeof locationSchema>;
export type GetLocationInput = z.infer<typeof getLocationInputSchema>;
export type CreateLocationInput = z.infer<typeof createLocationInputSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationInputSchema>;
export type DeleteLocationInput = z.infer<typeof deleteLocationInputSchema>;
