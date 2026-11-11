// Shared helpers for integration tests.
// Each test creates its own events/admins/registrations and cleans them up in
// afterAll so tests don't depend on leftover rows from other runs.

import { createApp } from "../../src/app.js";
import prisma from "../../src/config/prisma.js";
import { generateToken } from "../../src/utils/jwt.js";
import { generateManageToken, hashManageToken } from "../../src/utils/manageToken.js";

export function app() {
	return createApp();
}

// Creates a throwaway admin and returns a ready-to-use Bearer token
export async function loginAs(role: "SUPER_ADMIN" | "ADMIN" = "SUPER_ADMIN") {
	const email = `admin-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
	const bcrypt = await import("bcrypt");
	const password = "password123";
	const admin = await prisma.admin.create({
		data: {
			name: `Test ${role}`,
			email,
			// Cost 4 (not 12) to keep tests fast
			password: await bcrypt.hash(password, 4),
			role,
		},
	});
	const token = generateToken(admin.id, admin.role);
	return { admin, token, password, email };
}

// Creates an upcoming event by default; override times for ended/live cases
export async function createTestEvent(overrides: Partial<{
	title: string;
	startTime: Date;
	endTime: Date;
	imageUrl: string;
	eventLink: string;
	replayUrl: string | null;
}> = {}) {
	const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	return prisma.events.create({
		data: {
			title: overrides.title ?? `Test Event ${suffix}`,
			startTime: overrides.startTime ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
			endTime: overrides.endTime ?? new Date(Date.now() + 25 * 60 * 60 * 1000),
			imageUrl: overrides.imageUrl ?? "https://example.com/image.jpg",
			eventLink: overrides.eventLink ?? `https://youtube.com/watch?v=${suffix}`,
			...(overrides.replayUrl !== undefined ? { replayUrl: overrides.replayUrl } : {}),
		},
	});
}

// Creates an ACTIVE registration and returns its plaintext manage token
export async function createRegistrationForEvent(eventId: string, overrides: Partial<{
	name: string;
	email: string;
	phone: string | null;
}> = {}) {
	const manageToken = generateManageToken();
	const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const registration = await prisma.registrations.create({
		data: {
			name: overrides.name ?? `Test User ${suffix}`,
			email: overrides.email ?? `user-${suffix}@test.local`,
			phone: overrides.phone === undefined ? "+2348000000000" : overrides.phone,
			eventId,
			manageTokenHash: hashManageToken(manageToken),
			status: "ACTIVE",
		},
	});
	return { registration, manageToken };
}

// Deletes test rows in FK-safe order (children before parents)
export async function cleanupByIds(
	ids: { events?: string[]; registrations?: string[]; admins?: string[]; feedback?: string[] },
) {
	if (ids.feedback?.length) {
		await prisma.feedback.deleteMany({ where: { id: { in: ids.feedback } } });
	}
	if (ids.registrations?.length) {
		await prisma.feedback.deleteMany({
			where: { registrationId: { in: ids.registrations } },
		});
		await prisma.registrations.deleteMany({ where: { id: { in: ids.registrations } } });
	}
	if (ids.events?.length) {
		await prisma.feedback.deleteMany({ where: { eventId: { in: ids.events } } });
		await prisma.registrations.deleteMany({ where: { eventId: { in: ids.events } } });
		await prisma.events.deleteMany({ where: { id: { in: ids.events } } });
	}
	if (ids.admins?.length) {
		await prisma.admin.deleteMany({ where: { id: { in: ids.admins } } });
	}
}

export { prisma };
