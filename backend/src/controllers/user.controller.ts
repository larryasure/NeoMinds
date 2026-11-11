// Registration self-service: create, view, update, cancel — no user accounts.
// Access is via a manage token returned once at registration (see utils/manageToken.ts).

import type { Request, Response } from "express";
import prisma from "../config/prisma.js";
import {
	createRegistrationDto,
	editRegistrationDto,
	getRegistrationDto,
} from "../validators/registration.validator.js";
import { getEventStatus } from "../utils/eventStatus.js";
import {
	generateManageToken,
	hashManageToken,
} from "../utils/manageToken.js";

// Read X-Manage-Token header (used by update/cancel)
function getManageToken(req: Request): string | null {
	const header = req.headers["x-manage-token"];
	if (typeof header === "string" && header.length > 0) return header;
	return null;
}

// GET /user/event/:manageToken — look up by hashed token
export const getRegistration = async (req: Request, res: Response) => {
	const { manageToken } = res.locals.validatedParams as getRegistrationDto;

	// Hash the incoming token and match against the stored hash
	const record = await prisma.registrations.findUnique({
		where: { manageTokenHash: hashManageToken(manageToken) },
		include: { event: true },
	});
	if (!record) return res.status(404).json({ message: "Registration not found" });

	return res.status(200).json({
		id: record.id,
		name: record.name,
		email: record.email,
		phone: record.phone,
		status: record.status,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		event: {
			id: record.event.id,
			title: record.event.title,
			startTime: record.event.startTime,
			endTime: record.event.endTime,
			imageUrl: record.event.imageUrl,
			eventLink: record.event.eventLink,
			replayUrl: record.event.replayUrl,
			status: getEventStatus(record.event.startTime, record.event.endTime),
		},
	});
};

// POST /user/event — public registration
export const createRegistration = async (req: Request, res: Response) => {
	const { email, eventId, name, phone } = req.body as createRegistrationDto;

	const event = await prisma.events.findUnique({ where: { id: eventId } });
	if (!event) return res.status(404).json({ message: "Event not found" });

	// Block signups after the event has ended
	if (getEventStatus(event.startTime, event.endTime) === "ended") {
		return res.status(400).json({ message: "Registration is closed for this event" });
	}

	// One ACTIVE registration per email per event.
	// Cancelled rows don't count, so users can re-register after cancelling.
	const existing = await prisma.registrations.findFirst({
		where: { email, eventId, status: "ACTIVE" },
	});
	if (existing) {
		return res
			.status(409)
			.json({ message: "A registration with this email already exists for this event" });
	}

	// Generate token, store only its hash, return plaintext once in the response
	const manageToken = generateManageToken();
	const registration = await prisma.registrations.create({
		data: {
			name,
			email,
			phone,
			eventId,
			manageTokenHash: hashManageToken(manageToken),
			status: "ACTIVE",
		},
	});

	return res.status(201).json({
		registration: {
			id: registration.id,
			name: registration.name,
			email: registration.email,
			phone: registration.phone,
			status: registration.status,
			eventId: registration.eventId,
			createdAt: registration.createdAt,
		},
		manageToken,
	});
};

// PATCH /user/event — update name/email/phone (requires X-Manage-Token)
export const updateRegistration = async (req: Request, res: Response) => {
	const token = getManageToken(req);
	if (!token) {
		return res.status(401).json({ message: "Manage token required" });
	}

	const updates = req.body as editRegistrationDto;
	// Zod allows an empty object; reject it so we don't run a no-op update
	if (Object.keys(updates).length === 0) {
		return res.status(400).json({ message: "No fields to update" });
	}

	const record = await prisma.registrations.findUnique({
		where: { manageTokenHash: hashManageToken(token) },
	});
	if (!record) return res.status(404).json({ message: "Registration not found" });

	// Changing email must not collide with another ACTIVE registration for this event
	if (updates.email && updates.email !== record.email) {
		const duplicate = await prisma.registrations.findFirst({
			where: {
				email: updates.email,
				eventId: record.eventId,
				status: "ACTIVE",
				id: { not: record.id },
			},
		});
		if (duplicate) {
			return res
				.status(409)
				.json({ message: "A registration with this email already exists for this event" });
		}
	}

	const updated = await prisma.registrations.update({
		where: { id: record.id },
		data: updates,
	});

	return res.status(200).json({
		id: updated.id,
		name: updated.name,
		email: updated.email,
		phone: updated.phone,
		status: updated.status,
		updatedAt: updated.updatedAt,
	});
};

// DELETE /user/event — soft-cancel (status → CANCELLED), never hard-deletes
export const cancelRegistration = async (req: Request, res: Response) => {
	const token = getManageToken(req);
	if (!token) {
		return res.status(401).json({ message: "Manage token required" });
	}

	const record = await prisma.registrations.findUnique({
		where: { manageTokenHash: hashManageToken(token) },
	});
	if (!record) return res.status(404).json({ message: "Registration not found" });

	// Idempotent: second cancel returns 200 instead of erroring
	if (record.status === "CANCELLED") {
		return res.status(200).json({ message: "Registration is already cancelled" });
	}

	await prisma.registrations.update({
		where: { id: record.id },
		data: { status: "CANCELLED" },
	});

	return res.status(204).send();
};
