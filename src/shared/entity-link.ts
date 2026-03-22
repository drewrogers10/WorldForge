import { z } from 'zod';

const entityLinkIdSchema = z.number().int().positive();
const entityKindSchema = z.enum(['location', 'event']);
const linkKindSchema = z.enum(['file', 'url']);
const entityIdSchema = z.number().int().positive();
const labelSchema = z.string().trim().min(1).max(120);
const targetSchema = z.string().trim().min(1).max(4000);

export const entityLinkSchema = z.object({
  id: entityLinkIdSchema,
  entityKind: entityKindSchema,
  entityId: entityIdSchema,
  linkKind: linkKindSchema,
  label: labelSchema,
  target: targetSchema,
  createdAt: z.string().min(1),
});

export const listEntityLinksInputSchema = z.object({
  entityKind: entityKindSchema,
  entityId: entityIdSchema,
});

export const createEntityLinkInputSchema = z.object({
  entityKind: entityKindSchema,
  entityId: entityIdSchema,
  linkKind: linkKindSchema,
  label: labelSchema,
  target: targetSchema,
});

export const updateEntityLinkInputSchema = createEntityLinkInputSchema.extend({
  id: entityLinkIdSchema,
});

export const deleteEntityLinkInputSchema = z.object({
  id: entityLinkIdSchema,
});

export type EntityLink = z.infer<typeof entityLinkSchema>;
export type EntityKind = z.infer<typeof entityKindSchema>;
export type LinkKind = z.infer<typeof linkKindSchema>;
export type ListEntityLinksInput = z.infer<typeof listEntityLinksInputSchema>;
export type CreateEntityLinkInput = z.infer<typeof createEntityLinkInputSchema>;
export type UpdateEntityLinkInput = z.infer<typeof updateEntityLinkInputSchema>;
export type DeleteEntityLinkInput = z.infer<typeof deleteEntityLinkInputSchema>;
