import { z } from 'zod';

const itemIdSchema = z.number().int().positive();
const itemNameSchema = z.string().trim().min(1).max(120);
const itemSummarySchema = z.string().trim().max(4000);
const itemQuantitySchema = z.number().int().nonnegative();
const nullableOwnerCharacterIdSchema = itemIdSchema.nullable();
const nullableLocationIdSchema = itemIdSchema.nullable();

const itemAssignmentSchema = z
  .object({
    ownerCharacterId: nullableOwnerCharacterIdSchema,
    locationId: nullableLocationIdSchema,
  })
  .refine(
    (value) => value.ownerCharacterId === null || value.locationId === null,
    {
      message: 'Item cannot be assigned to both a character and a location.',
      path: ['locationId'],
    },
  );

export const itemSchema = z
  .object({
    id: itemIdSchema,
    name: itemNameSchema,
    summary: itemSummarySchema,
    quantity: itemQuantitySchema,
    ownerCharacterId: nullableOwnerCharacterIdSchema,
    locationId: nullableLocationIdSchema,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .refine(
    (value) => value.ownerCharacterId === null || value.locationId === null,
    {
      message: 'Item cannot be assigned to both a character and a location.',
      path: ['locationId'],
    },
  );

export const getItemInputSchema = z.object({
  id: itemIdSchema,
});

export const createItemInputSchema = z
  .object({
    name: itemNameSchema,
    summary: itemSummarySchema,
    quantity: itemQuantitySchema,
    ownerCharacterId: nullableOwnerCharacterIdSchema,
    locationId: nullableLocationIdSchema,
  })
  .and(itemAssignmentSchema);

export const updateItemInputSchema = z
  .object({
    id: itemIdSchema,
    name: itemNameSchema,
    summary: itemSummarySchema,
    quantity: itemQuantitySchema,
    ownerCharacterId: nullableOwnerCharacterIdSchema,
    locationId: nullableLocationIdSchema,
  })
  .and(itemAssignmentSchema);

export const deleteItemInputSchema = getItemInputSchema;

export type Item = z.infer<typeof itemSchema>;
export type GetItemInput = z.infer<typeof getItemInputSchema>;
export type CreateItemInput = z.infer<typeof createItemInputSchema>;
export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;
export type DeleteItemInput = z.infer<typeof deleteItemInputSchema>;
