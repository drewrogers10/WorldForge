import { z } from 'zod';

const characterNameSchema = z.string().trim().min(1).max(120);
const characterSummarySchema = z.string().trim().max(4000);

export const characterSchema = z.object({
  id: z.number().int().positive(),
  name: characterNameSchema,
  summary: characterSummarySchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const getCharacterInputSchema = z.object({
  id: z.number().int().positive(),
});

export const createCharacterInputSchema = z.object({
  name: characterNameSchema,
  summary: characterSummarySchema,
});

export const updateCharacterInputSchema = z.object({
  id: z.number().int().positive(),
  name: characterNameSchema,
  summary: characterSummarySchema,
});

export type Character = z.infer<typeof characterSchema>;
export type GetCharacterInput = z.infer<typeof getCharacterInputSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterInputSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterInputSchema>;
