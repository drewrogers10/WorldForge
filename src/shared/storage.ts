import { z } from 'zod';
import { worldTickSchema } from './temporal';

export const worldEntityTypeSchema = z.enum(['character', 'location', 'item']);

const entityIdSchema = z.number().int().positive();

export const searchWorldInputSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(50).optional(),
});

export const semanticSearchInputSchema = searchWorldInputSchema.extend({
  tick: worldTickSchema.optional(),
});

export const worldSearchHitSchema = z.object({
  entityType: worldEntityTypeSchema,
  entityId: entityIdSchema,
  title: z.string().min(1),
  summary: z.string(),
  matchedText: z.string().min(1),
  score: z.number(),
  tick: worldTickSchema.optional(),
});

export const storageOperationResultSchema = z.object({
  processedCount: z.number().int().nonnegative(),
  updatedCount: z.number().int().nonnegative(),
  deletedCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  errors: z.array(z.string()),
});

export const storageHealthSchema = z.object({
  worldRoot: z.string().min(1),
  vectorEngine: z.string().min(1),
  documentDirtyCount: z.number().int().nonnegative(),
  vectorDirtyCount: z.number().int().nonnegative(),
  pendingSnapshotCount: z.number().int().nonnegative(),
  searchDocumentCount: z.number().int().nonnegative(),
  lastDocumentError: z.string().nullable(),
  lastVectorError: z.string().nullable(),
});

export type WorldEntityType = z.infer<typeof worldEntityTypeSchema>;
export type SearchWorldInput = z.infer<typeof searchWorldInputSchema>;
export type SemanticSearchInput = z.infer<typeof semanticSearchInputSchema>;
export type WorldSearchHit = z.infer<typeof worldSearchHitSchema>;
export type StorageOperationResult = z.infer<typeof storageOperationResultSchema>;
export type StorageHealth = z.infer<typeof storageHealthSchema>;
