// Event CRUD + discovery endpoints.
// Reads are public; create/update/delete are admin-guarded in the route file.
// Every event response includes a computed `status` (upcoming | live | ended).

import type { Request, Response } from "express";
import {
	createEventDto,
	deleteEventDto,
	getEventDto,
	listPreviousEventsDto,
	updateEventDto,
} from "../validators/event.validator.js";
import prisma from "../config/prisma.js";
import { withEventStatus } from "../utils/eventStatus.js";

// GET /events — all events, soonest first
export const getEvents = async (req: Request, res: Response) => {
	const records = await prisma.events.findMany({
		orderBy: { startTime: "asc" },
	});
	// findMany always returns an array — empty list is 200 [], not 404
	return res.status(200).json(records.map((e) => withEventStatus(e)));
};

// GET /events/:id — single event
export const getEventById = async (req: Request, res: Response) => {
	const { id } = res.locals.validatedParams as getEventDto;
	const record = await prisma.events.findUnique({ where: { id } });
	if (!record) return res.status(404).json({ message: "Event doesn't exist" });

	return res.status(200).json(withEventStatus(record));
};

// GET /events/latest — earliest event that hasn't ended yet (upcoming or live)
export const getLatestEvent = async (req: Request, res: Response) => {
	const record = await prisma.events.findFirst({
		where: { endTime: { gte: new Date() } },
		orderBy: { startTime: "asc" },
	});
	if (!record) return res.status(404).json({ message: "No upcoming event" });

	return res.status(200).json(withEventStatus(record));
};

// GET /events/previous — ended events for the replay section (newest first)
export const getPreviousEvents = async (req: Request, res: Response) => {
	const { limit } = res.locals.validatedQuery as listPreviousEventsDto;
	const records = await prisma.events.findMany({
		where: { endTime: { lt: new Date() } },
		orderBy: { endTime: "desc" },
		take: limit,
	});
	return res.status(200).json(records.map((e) => withEventStatus(e)));
};

// POST /events — admin only (auth is on the route)
export const createEvent = async (req: Request, res: Response) => {
	const { eventLink, startTime, endTime, replayUrl, ...rest } =
		req.body as createEventDto;

	// Start must be strictly before end
	if (new Date(startTime) >= new Date(endTime))
		return res.status(400).json({ message: "Invalid event times" });

	// eventLink and startTime must not collide with an existing event
	const existing = await prisma.events.findFirst({
		where: { OR: [{ eventLink }, { startTime }] },
	});
	if (existing)
		return res
			.status(409)
			.json({ message: "Event already exists or conflicts with another" });

	const event = await prisma.events.create({
		data: {
			...rest,
			eventLink,
			startTime: new Date(startTime),
			endTime: new Date(endTime),
			// Omit replayUrl entirely when not provided (undefined ≠ null in Prisma)
			...(replayUrl ? { replayUrl } : {}),
		},
	});
	return res.status(201).json(withEventStatus(event));
};

// PATCH /events — partial update; only fields present in the body are written
export const updateEvent = async (req: Request, res: Response) => {
	const { id, startTime, endTime, replayUrl, ...rest } =
		req.body as updateEventDto;

	const existing = await prisma.events.findUnique({ where: { id } });
	if (!existing) return res.status(404).json({ message: "Event doesn't exist" });

	// Validate the *resulting* times: use existing values for fields not being changed
	const newStart = startTime ? new Date(startTime) : existing.startTime;
	const newEnd = endTime ? new Date(endTime) : existing.endTime;
	if (newStart >= newEnd)
		return res.status(400).json({ message: "Invalid event times" });

	const data: Record<string, unknown> = { ...rest };
	if (startTime) data.startTime = newStart;
	if (endTime) data.endTime = newEnd;
	// undefined = leave unchanged; null = clear replayUrl
	if (replayUrl !== undefined) data.replayUrl = replayUrl;

	const event = await prisma.events.update({
		where: { id },
		data,
	});
	return res.status(200).json(withEventStatus(event));
};

// DELETE /events — hard delete; id comes in the body (see event.validator.ts)
export const deleteEvent = async (req: Request, res: Response) => {
	const { id } = req.body as deleteEventDto;

	const record = await prisma.events.findUnique({ where: { id } });
	if (!record) return res.status(404).json({ message: "Event doesn't exist" });

	await prisma.events.delete({ where: { id } });
	return res.status(204).send();
};
