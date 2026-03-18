import { z, type ZodTypeAny } from 'zod';

export const worldTickSchema = z.number().int().min(0);

export const asOfInputSchema = z.object({
  asOfTick: worldTickSchema.optional(),
});

export const effectiveTickSchema = worldTickSchema;

export const timelineBoundsSchema = z.object({
  minTick: worldTickSchema,
  maxTick: worldTickSchema,
  presentTick: worldTickSchema,
});

export const timelineAnchorSchema = z.object({
  tick: worldTickSchema,
  label: z.string().min(1),
  changeCount: z.number().int().nonnegative(),
});

export const temporalDetailStatusSchema = z.enum([
  'active',
  'notYetCreated',
  'ended',
  'missing',
]);

export function createTemporalDetailSchema<TRecord extends ZodTypeAny>(
  recordSchema: TRecord,
) {
  return z.object({
    status: temporalDetailStatusSchema,
    record: recordSchema.nullable(),
  });
}

export type WorldTick = z.infer<typeof worldTickSchema>;
export type AsOfInput = z.infer<typeof asOfInputSchema>;
export type TimelineBounds = z.infer<typeof timelineBoundsSchema>;
export type TimelineAnchor = z.infer<typeof timelineAnchorSchema>;
export type TemporalDetailStatus = z.infer<typeof temporalDetailStatusSchema>;
export type TemporalDetailResult<TRecord> = {
  status: TemporalDetailStatus;
  record: TRecord | null;
};
