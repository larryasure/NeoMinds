// Integration tests: event reads/mutations (incl. admin guards) and
// feedback submit/read (duplicate, wrong event, auth).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import {
	app,
	createTestEvent,
	cleanupByIds,
	loginAs,
	createRegistrationForEvent,
} from "../helpers/testUtils.js";

describe("events API", () => {
	const created: { events?: string[]; admins?: string[] } = {};
	let admin: Awaited<ReturnType<typeof loginAs>>;

	beforeAll(async () => {
		admin = await loginAs("SUPER_ADMIN");
		created.admins = [admin.admin.id];
	});

	afterAll(async () => {
		await cleanupByIds(created);
	});

	it("lists events with status", async () => {
		const res = await request(app()).get("/events");
		expect(res.status).toBe(200);
		expect(Array.isArray(res.body)).toBe(true);
	});

	it("returns empty array when no events match previous", async () => {
		const res = await request(app()).get("/events/previous");
		expect(res.status).toBe(200);
		expect(Array.isArray(res.body)).toBe(true);
	});

	it("gets latest upcoming event", async () => {
		const event = await createTestEvent({
			title: "Latest Test",
			startTime: new Date(Date.now() + 3600000),
			endTime: new Date(Date.now() + 7200000),
		});
		created.events = [...(created.events ?? []), event.id];

		const res = await request(app()).get("/events/latest");
		expect(res.status).toBe(200);
		expect(res.body.id).toBe(event.id);
		expect(res.body.status).toBe("upcoming");
	});

	it("gets event by id", async () => {
		const event = await createTestEvent();
		created.events = [...(created.events ?? []), event.id];

		const res = await request(app()).get(`/events/${event.id}`);
		expect(res.status).toBe(200);
		expect(res.body.id).toBe(event.id);
	});

	it("404s on missing event", async () => {
		const res = await request(app()).get(
			"/events/00000000-0000-4000-8000-000000000000",
		);
		expect(res.status).toBe(404);
	});

	it("blocks delete without auth", async () => {
		const res = await request(app())
			.delete("/events")
			.send({ id: "00000000-0000-4000-8000-000000000000" });
		expect(res.status).toBe(401);
	});

	it("allows admin to update event", async () => {
		const event = await createTestEvent();
		created.events = [...(created.events ?? []), event.id];

		const res = await request(app())
			.patch("/events")
			.set("Authorization", `Bearer ${admin.token}`)
			.send({ id: event.id, title: "Updated Title" });
		expect(res.status).toBe(200);
		expect(res.body.title).toBe("Updated Title");
	});

	it("rejects invalid times on create", async () => {
		const res = await request(app())
			.post("/events")
			.set("Authorization", `Bearer ${admin.token}`)
			.send({
				title: "Bad Times",
				startTime: new Date(Date.now() + 86400000).toISOString(),
				endTime: new Date(Date.now() + 3600000).toISOString(),
				imageUrl: "https://example.com/a.jpg",
				eventLink: `https://youtube.com/watch?v=bad-${Date.now()}`,
			});
		expect(res.status).toBe(400);
	});
});

describe("feedback API", () => {
	const created: {
		events?: string[];
		registrations?: string[];
		admins?: string[];
	} = {};
	let event: Awaited<ReturnType<typeof createTestEvent>>;
	let registrationId: string;
	let admin: Awaited<ReturnType<typeof loginAs>>;

	beforeAll(async () => {
		admin = await loginAs("SUPER_ADMIN");
		created.admins = [admin.admin.id];
		event = await createTestEvent();
		created.events = [event.id];
		const { registration } = await createRegistrationForEvent(event.id);
		registrationId = registration.id;
		created.registrations = [registration.id];
	});

	afterAll(async () => {
		await cleanupByIds(created);
	});

	const validBody = () => ({
		eventId: event.id,
		registrationId,
		rating: 5,
		conversationValue: "VERY_VALUABLE",
		usefulPart: "The live coding section",
		futureImprovements: "More Q&A time",
		recommendedTopics: "Advanced TypeScript",
		attendance: "DEFINITELY",
		volunteer: "YES",
	});

	it("submits feedback successfully", async () => {
		const res = await request(app()).post("/feedback").send(validBody());
		expect(res.status).toBe(201);
		expect(res.body.id).toBeTruthy();
	});

	it("rejects duplicate feedback", async () => {
		const res = await request(app()).post("/feedback").send(validBody());
		expect(res.status).toBe(409);
	});

	it("404s when registration does not belong to event", async () => {
		const otherEvent = await createTestEvent();
		created.events = [...(created.events ?? []), otherEvent.id];
		const otherReg = await createRegistrationForEvent(otherEvent.id);
		created.registrations = [
			...(created.registrations ?? []),
			otherReg.registration.id,
		];

		const res = await request(app())
			.post("/feedback")
			.send({ ...validBody(), eventId: otherEvent.id, registrationId });
		expect(res.status).toBe(404);
	});

	it("validates rating bounds", async () => {
		const res = await request(app())
			.post("/feedback")
			.send({ ...validBody(), rating: 9 });
		expect(res.status).toBe(400);
	});

	it("requires auth to read feedback", async () => {
		const res = await request(app()).get(`/feedback/${event.id}`);
		expect(res.status).toBe(401);
	});

	it("admin can read feedback", async () => {
		const res = await request(app())
			.get(`/feedback/${event.id}`)
			.set("Authorization", `Bearer ${admin.token}`);
		expect(res.status).toBe(200);
		expect(Array.isArray(res.body)).toBe(true);
		expect(res.body.length).toBeGreaterThanOrEqual(1);
	});
});
