import { z } from 'zod';
import { locationReferenceSchema } from './location';
import {
  createTemporalDetailSchema,
  worldTickSchema,
} from './temporal';

const eventIdSchema = z.number().int().positive();
const eventTitleSchema = z.string().trim().min(1).max(160);
const eventSummarySchema = z.string().trim().max(4000);
const nullableLocationIdSchema = z.number().int().positive().nullable();

export const eventReferenceSchema = z.object({
  id: eventIdSchema,
  title: eventTitleSchema,
});

export const eventSchema = z.object({
  id: eventIdSchema,
  title: eventTitleSchema,
  summary: eventSummarySchema,
  startTick: worldTickSchema,
  endTick: worldTickSchema.nullable(),
  primaryLocationId: nullableLocationIdSchema,
  primaryLocation: locationReferenceSchema.nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).refine(
  (value) => value.endTick === null || value.endTick >= value.startTick,
  {
    message: 'Event end tick must be greater than or equal to the start tick.',
    path: ['endTick'],
  },
);

export const listEventsInputSchema = z.object({
  asOfTick: worldTickSchema.optional(),
  locationId: z.number().int().positive().optional(),
});

export const getEventInputSchema = z.object({
  id: eventIdSchema,
  asOfTick: worldTickSchema.optional(),
});

export const createEventInputSchema = z.object({
  title: eventTitleSchema,
  summary: eventSummarySchema,
  startTick: worldTickSchema,
  endTick: worldTickSchema.nullable(),
  primaryLocationId: nullableLocationIdSchema,
}).refine(
  (value) => value.endTick === null || value.endTick >= value.startTick,
  {
    message: 'Event end tick must be greater than or equal to the start tick.',
    path: ['endTick'],
  },
);

export const updateEventInputSchema = createEventInputSchema.extend({
  id: eventIdSchema,
});

export const deleteEventInputSchema = z.object({
  id: eventIdSchema,
});

export const eventDetailSchema = createTemporalDetailSchema(eventSchema);

export type Event = z.infer<typeof eventSchema>;
export type EventReference = z.infer<typeof eventReferenceSchema>;
export type ListEventsInput = z.infer<typeof listEventsInputSchema>;
export type GetEventInput = z.infer<typeof getEventInputSchema>;
export type CreateEventInput = z.infer<typeof createEventInputSchema>;
export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;
export type DeleteEventInput = z.infer<typeof deleteEventInputSchema>;
export type EventDetail = z.infer<typeof eventDetailSchema>;
