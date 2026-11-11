// Zod schemas for event requests and queries.
// Times must be ISO 8601 with an offset (e.g. 2026-11-15T14:00:00.000Z).

import { z } from "zod";

export const getEventSchema = z.object({
	id: z.uuid("Invalid event id"),
});

export const createEventSchema = z.object({
	title: z
		.string("Invalid title")
		.min(2, "Title must be at least 2 characters"),
	startTime: z.iso.datetime({ offset: true }),
	endTime: z.iso.datetime({ offset: true }),
	eventLink: z.url("Invalid URL"),
	imageUrl: z.url("Invalid URL"),
	replayUrl: z.url("Invalid URL").optional(),
});

export const updateEventSchema = z.object({
	id: z.uuid("Invalid event id"),
	title: z
		.string("Invalid title")
		.min(2, "Title must be at least 2 characters")
		.optional(),
	startTime: z.iso.datetime({ offset: true }).optional(),
	endTime: z.iso.datetime({ offset: true }).optional(),
	eventLink: z.url("Invalid URL").optional(),
	imageUrl: z.url("Invalid URL").optional(),
	// null clears the field; omit leaves it unchanged
	replayUrl: z.url("Invalid URL").optional().nullable(),
});

// DELETE /events — id lives in the body, not the path
export const deleteEventSchema = z.object({
	id: z.uuid("Invalid event id"),
});

// GET /events/previous?limit=…
export const listPreviousEventsSchema = z.object({
	limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type getEventDto = z.infer<typeof getEventSchema>;
export type createEventDto = z.infer<typeof createEventSchema>;
export type updateEventDto = z.infer<typeof updateEventSchema>;
export type deleteEventDto = z.infer<typeof deleteEventSchema>;
export type listPreviousEventsDto = z.infer<typeof listPreviousEventsSchema>;
