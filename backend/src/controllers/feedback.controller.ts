// Feedback: public submission + admin-only read per event.
// One feedback row per (registration, event) — enforced in code and by a DB unique index.

import type { Request, Response } from "express";
import prisma from "../config/prisma.js";
import {
	createFeedbackDto,
	getEventFeedbackDto,
} from "../validators/feedback.validator.js";

// GET /feedback/:eventId — admin only (auth is on the route)
export const getEventFeedback = async (req: Request, res: Response) => {
	const { eventId } = res.locals.validatedParams as getEventFeedbackDto;
	const feedback = await prisma.feedback.findMany({
		where: { eventId },
		orderBy: { id: "desc" },
	});
	// Unknown-but-valid eventId returns [] rather than 404 (documented behavior)
	return res.status(200).json(feedback);
};

// POST /feedback — public submission
export const createFeedback = async (req: Request, res: Response) => {
	const body = req.body as createFeedbackDto;

	const event = await prisma.events.findUnique({ where: { id: body.eventId } });
	if (!event) return res.status(404).json({ message: "Event not found" });

	// Registration must exist and belong to the same event
	const registration = await prisma.registrations.findUnique({
		where: { id: body.registrationId },
	});
	if (!registration || registration.eventId !== body.eventId) {
		return res.status(404).json({ message: "Registration not found for this event" });
	}

	const existing = await prisma.feedback.findFirst({
		where: {
			eventId: body.eventId,
			registrationId: body.registrationId,
		},
	});
	if (existing) {
		return res.status(409).json({ message: "Feedback already submitted" });
	}

	const feedback = await prisma.feedback.create({ data: body });
	return res.status(201).json({ id: feedback.id });
};
