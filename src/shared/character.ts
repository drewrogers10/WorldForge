import { z } from 'zod';
import { locationReferenceSchema } from './location';
import {
  createTemporalDetailSchema,
  effectiveTickSchema,
  worldTickSchema,
} from './temporal';

const characterIdSchema = z.number().int().positive();
const characterNameSchema = z.string().trim().min(1).max(120);
const characterSummarySchema = z.string().trim().max(4000);
const nullableLocationIdSchema = characterIdSchema.nullable();

export const characterReferenceSchema = z.object({
  id: characterIdSchema,
  name: characterNameSchema,
});

export const characterSchema = z.object({
  id: characterIdSchema,
  name: characterNameSchema,
  summary: characterSummarySchema,
  locationId: nullableLocationIdSchema,
  location: locationReferenceSchema.nullable(),
  existsFromTick: worldTickSchema,
  existsToTick: worldTickSchema.nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const getCharacterInputSchema = z.object({
  id: characterIdSchema,
  asOfTick: worldTickSchema.optional(),
});

export const createCharacterInputSchema = z.object({
  name: characterNameSchema,
  summary: characterSummarySchema,
  locationId: nullableLocationIdSchema,
  effectiveTick: effectiveTickSchema,
});

export const updateCharacterInputSchema = z.object({
  id: characterIdSchema,
  name: characterNameSchema,
  summary: characterSummarySchema,
  locationId: nullableLocationIdSchema,
  effectiveTick: effectiveTickSchema,
});

export const deleteCharacterInputSchema = z.object({
  id: characterIdSchema,
  effectiveTick: effectiveTickSchema,
});

export const characterDetailSchema = createTemporalDetailSchema(characterSchema);

export type Character = z.infer<typeof characterSchema>;
export type CharacterReference = z.infer<typeof characterReferenceSchema>;
export type GetCharacterInput = z.infer<typeof getCharacterInputSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterInputSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterInputSchema>;
export type DeleteCharacterInput = z.infer<typeof deleteCharacterInputSchema>;
export type CharacterDetail = z.infer<typeof characterDetailSchema>;
