// Integration tests: registration lifecycle (create → manage → cancel → re-register),
// manage-token security, and validation/duplicate edge cases.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import {
	app,
	createTestEvent,
	cleanupByIds,
	loginAs,
} from "../helpers/testUtils.js";

describe("registration lifecycle", () => {
	const created: { events?: string[]; registrations?: string[] } = {};
	let event: Awaited<ReturnType<typeof createTestEvent>>;
	let manageToken: string;
	let registrationId: string;

	beforeAll(async () => {
		event = await createTestEvent();
		created.events = [event.id];
	});

	afterAll(async () => {
		await cleanupByIds(created);
	});

	it("registers without phone and returns manage token once", async () => {
		const res = await request(app())
			.post("/user/event")
			.send({
				name: "Jane Doe",
				email: `jane-${Date.now()}@test.local`,
				eventId: event.id,
			});
		expect(res.status).toBe(201);
		expect(res.body.manageToken).toBeTruthy();
		expect(res.body.registration.status).toBe("ACTIVE");
		expect(res.body.registration.phone).toBeNull();
		manageToken = res.body.manageToken;
		registrationId = res.body.registration.id;
		created.registrations = [registrationId];
	});

	it("rejects duplicate ACTIVE registration for same email+event", async () => {
		const email = `dup-${Date.now()}@test.local`;
		const first = await request(app())
			.post("/user/event")
			.send({ name: "Dup User", email, eventId: event.id });
		expect(first.status).toBe(201);
		created.registrations = [...(created.registrations ?? []), first.body.registration.id];

		const second = await request(app())
			.post("/user/event")
			.send({ name: "Dup User Again", email, eventId: event.id });
		expect(second.status).toBe(409);
	});

	it("rejects registration for missing event", async () => {
		const res = await request(app())
			.post("/user/event")
			.send({
				name: "No Event",
				email: `noevent-${Date.now()}@test.local`,
				eventId: "00000000-0000-4000-8000-000000000000",
			});
		expect(res.status).toBe(404);
	});

	it("rejects registration for ended event", async () => {
		const past = await createTestEvent({
			startTime: new Date(Date.now() - 48 * 3600000),
			endTime: new Date(Date.now() - 47 * 3600000),
		});
		created.events = [...(created.events ?? []), past.id];

		const res = await request(app())
			.post("/user/event")
			.send({
				name: "Late",
				email: `late-${Date.now()}@test.local`,
				eventId: past.id,
			});
		expect(res.status).toBe(400);
	});

	it("validates required fields", async () => {
		const res = await request(app())
			.post("/user/event")
			.send({ email: "not-an-email" });
		expect(res.status).toBe(400);
		expect(res.body.errors).toBeTruthy();
	});

	it("gets registration by manage token", async () => {
		const res = await request(app()).get(`/user/event/${manageToken}`);
		expect(res.status).toBe(200);
		expect(res.body.id).toBe(registrationId);
		expect(res.body.event.id).toBe(event.id);
		expect(res.body.event.status).toBe("upcoming");
	});

	it("404s on wrong manage token", async () => {
		const res = await request(app()).get(
			`/user/event/${"a".repeat(43)}`,
		);
		expect(res.status).toBe(404);
	});

	it("updates name/email/phone with token header", async () => {
		const res = await request(app())
			.patch("/user/event")
			.set("X-Manage-Token", manageToken)
			.send({ name: "Jane Updated", phone: "+2348111111111" });
		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Jane Updated");
		expect(res.body.phone).toBe("+2348111111111");
	});

	it("rejects update without manage token", async () => {
		const res = await request(app())
			.patch("/user/event")
			.send({ name: "No Token" });
		expect(res.status).toBe(401);
	});

	it("rejects update with wrong manage token", async () => {
		const res = await request(app())
			.patch("/user/event")
			.set("X-Manage-Token", "b".repeat(43))
			.send({ name: "Wrong" });
		expect(res.status).toBe(404);
	});

	it("cancels registration (soft) with token", async () => {
		const res = await request(app())
			.delete("/user/event")
			.set("X-Manage-Token", manageToken);
		expect(res.status).toBe(204);
	});

	it("returns cancelled status on get after cancel", async () => {
		const res = await request(app()).get(`/user/event/${manageToken}`);
		expect(res.status).toBe(200);
		expect(res.body.status).toBe("CANCELLED");
	});

	it("allows re-registration with same email after cancel", async () => {
		// find cancelled registration email
		const cancelled = await request(app()).get(`/user/event/${manageToken}`);
		const email = cancelled.body.email;

		const res = await request(app())
			.post("/user/event")
			.send({ name: "Back Again", email, eventId: event.id });
		expect(res.status).toBe(201);
		expect(res.body.registration.status).toBe("ACTIVE");
		created.registrations = [
			...(created.registrations ?? []),
			res.body.registration.id,
		];
	});

	it("cancelling twice is idempotent 200", async () => {
		const res = await request(app())
			.delete("/user/event")
			.set("X-Manage-Token", manageToken);
		expect(res.status).toBe(200);
		expect(res.body.message).toContain("already cancelled");
	});
});
