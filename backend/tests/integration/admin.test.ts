// Integration tests: admin login/ACL, create-admin (SUPER_ADMIN only),
// and registration list/filter/export. Uses a real database via helpers/testUtils.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import {
	app,
	createTestEvent,
	cleanupByIds,
	loginAs,
	prisma,
} from "../helpers/testUtils.js";

describe("admin auth & ACL", () => {
	const created: { events?: string[]; admins?: string[] } = {};
	let superAdmin: Awaited<ReturnType<typeof loginAs>>;
	let normalAdmin: Awaited<ReturnType<typeof loginAs>>;

	beforeAll(async () => {
		superAdmin = await loginAs("SUPER_ADMIN");
		normalAdmin = await loginAs("ADMIN");
		created.admins = [superAdmin.admin.id, normalAdmin.admin.id];
	});

	afterAll(async () => {
		await cleanupByIds(created);
	});

	it("logs in with valid credentials", async () => {
		const res = await request(app())
			.post("/admin/login")
			.send({ email: superAdmin.email, password: superAdmin.password });
		expect(res.status).toBe(200);
		expect(res.body.token).toBeTruthy();
		expect(res.body.admin.role).toBe("SUPER_ADMIN");
	});

	it("rejects unknown email with 401", async () => {
		const res = await request(app())
			.post("/admin/login")
			.send({ email: "nobody@test.local", password: "wrongpass" });
		expect(res.status).toBe(401);
	});

	it("rejects wrong password with 401", async () => {
		const res = await request(app())
			.post("/admin/login")
			.send({ email: superAdmin.email, password: "wrongpass" });
		expect(res.status).toBe(401);
		expect(res.body.message).toBe("Invalid email or password");
	});

	it("rejects invalid login body with 400", async () => {
		const res = await request(app())
			.post("/admin/login")
			.send({ email: "not-an-email" });
		expect(res.status).toBe(400);
		expect(res.body.errors).toBeTruthy();
	});

	it("blocks event create without auth", async () => {
		const res = await request(app()).post("/events").send({});
		expect(res.status).toBe(401);
	});

	it("blocks event create with invalid token", async () => {
		const res = await request(app())
			.post("/events")
			.set("Authorization", "Bearer bogus")
			.send({});
		expect(res.status).toBe(401);
	});

	it("allows SUPER_ADMIN to create events", async () => {
		const res = await request(app())
			.post("/events")
			.set("Authorization", `Bearer ${superAdmin.token}`)
			.send({
				title: "ACL Test Event",
				startTime: new Date(Date.now() + 86400000).toISOString(),
				endTime: new Date(Date.now() + 90000000).toISOString(),
				imageUrl: "https://example.com/img.jpg",
				eventLink: `https://youtube.com/watch?v=acl-${Date.now()}`,
			});
		expect(res.status).toBe(201);
		expect(res.body.status).toBe("upcoming");
		created.events = [...(created.events ?? []), res.body.id];
	});

	it("SUPER_ADMIN can create normal admins", async () => {
		const res = await request(app())
			.post("/admin/admins")
			.set("Authorization", `Bearer ${superAdmin.token}`)
			.send({
				name: "Created Admin",
				email: `created-${Date.now()}@test.local`,
				password: "password123",
			});
		expect(res.status).toBe(201);
		expect(res.body.role).toBe("ADMIN");
		expect(res.body.password).toBeUndefined();
		created.admins = [...(created.admins ?? []), res.body.id];
	});

	it("ADMIN cannot create other admins", async () => {
		const res = await request(app())
			.post("/admin/admins")
			.set("Authorization", `Bearer ${normalAdmin.token}`)
			.send({
				name: "Sneaky",
				email: `sneaky-${Date.now()}@test.local`,
				password: "password123",
			});
		expect(res.status).toBe(403);
	});

	it("rejects weak password on create admin", async () => {
		const res = await request(app())
			.post("/admin/admins")
			.set("Authorization", `Bearer ${superAdmin.token}`)
			.send({
				name: "Weak",
				email: `weak-${Date.now()}@test.local`,
				password: "short",
			});
		expect(res.status).toBe(400);
	});

	it("rejects duplicate admin email", async () => {
		const res = await request(app())
			.post("/admin/admins")
			.set("Authorization", `Bearer ${superAdmin.token}`)
			.send({
				name: "Dup",
				email: superAdmin.email,
				password: "password123",
			});
		expect(res.status).toBe(409);
	});
});

describe("admin registration management", () => {
	const created: { events?: string[]; registrations?: string[]; admins?: string[] } = {};
	let admin: Awaited<ReturnType<typeof loginAs>>;
	let eventId: string;
	let regId: string;

	beforeAll(async () => {
		admin = await loginAs("SUPER_ADMIN");
		created.admins = [admin.admin.id];
		const event = await createTestEvent();
		eventId = event.id;
		created.events = [event.id];

		const suffix = Date.now();
		const token = (await import("../../src/utils/manageToken.js")).generateManageToken();
		const hash = (await import("../../src/utils/manageToken.js")).hashManageToken(token);
		const reg = await prisma.registrations.create({
			data: {
				name: "Filter Target",
				email: `filter-${suffix}@test.local`,
				phone: null,
				eventId,
				manageTokenHash: hash,
				status: "ACTIVE",
			},
		});
		regId = reg.id;
		created.registrations = [reg.id];
	});

	afterAll(async () => {
		await cleanupByIds(created);
	});

	it("lists registrations with pagination", async () => {
		const res = await request(app())
			.get("/admin/registrations")
			.set("Authorization", `Bearer ${admin.token}`)
			.query({ page: 1, limit: 5 });
		expect(res.status).toBe(200);
		expect(Array.isArray(res.body.items)).toBe(true);
		expect(res.body.page).toBe(1);
		expect(res.body.total).toBeGreaterThanOrEqual(1);
		// never leaks token hash
		for (const item of res.body.items) {
			expect(item.manageTokenHash).toBeUndefined();
		}
	});

	it("filters by search query", async () => {
		const res = await request(app())
			.get("/admin/registrations")
			.set("Authorization", `Bearer ${admin.token}`)
			.query({ q: "Filter Target" });
		expect(res.status).toBe(200);
		expect(res.body.items.some((r: { id: string }) => r.id === regId)).toBe(true);
	});

	it("filters by status", async () => {
		const res = await request(app())
			.get("/admin/registrations")
			.set("Authorization", `Bearer ${admin.token}`)
			.query({ status: "ACTIVE" });
		expect(res.status).toBe(200);
		for (const item of res.body.items) {
			expect(item.status).toBe("ACTIVE");
		}
	});

	it("gets single registration", async () => {
		const res = await request(app())
			.get(`/admin/registrations/${regId}`)
			.set("Authorization", `Bearer ${admin.token}`);
		expect(res.status).toBe(200);
		expect(res.body.id).toBe(regId);
		expect(res.body.manageTokenHash).toBeUndefined();
		expect(res.body.event).toBeTruthy();
	});

	it("404s on missing registration", async () => {
		const res = await request(app())
			.get(`/admin/registrations/00000000-0000-4000-8000-000000000000`)
			.set("Authorization", `Bearer ${admin.token}`);
		expect(res.status).toBe(404);
	});

	it("exports CSV without token hashes", async () => {
		const res = await request(app())
			.get("/admin/registrations/export")
			.set("Authorization", `Bearer ${admin.token}`);
		expect(res.status).toBe(200);
		expect(res.headers["content-type"]).toContain("text/csv");
		expect(res.text).toContain("email");
		expect(res.text).not.toContain("manageTokenHash");
	});

	it("requires auth for list", async () => {
		const res = await request(app()).get("/admin/registrations");
		expect(res.status).toBe(401);
	});
});
