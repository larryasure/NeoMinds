// Unit tests for pure helpers: JWT, manage-token hashing, event status.
// No database required — these run fast and in isolation.

import { describe, it, expect } from "vitest";
import { generateToken, verifyToken } from "../../src/utils/jwt.js";
import { generateManageToken, hashManageToken } from "../../src/utils/manageToken.js";
import { getEventStatus, withEventStatus } from "../../src/utils/eventStatus.js";

describe("jwt", () => {
	it("round-trips userId and role", () => {
		const token = generateToken("user-1", "SUPER_ADMIN");
		const payload = verifyToken(token);
		expect(payload.userId).toBe("user-1");
		expect(payload.role).toBe("SUPER_ADMIN");
	});

	it("rejects garbage tokens", () => {
		expect(() => verifyToken("not-a-token")).toThrow();
	});
});

describe("manageToken", () => {
	it("generates unique tokens", () => {
		expect(generateManageToken()).not.toBe(generateManageToken());
	});

	it("hashes deterministically", () => {
		const t = generateManageToken();
		expect(hashManageToken(t)).toBe(hashManageToken(t));
		expect(hashManageToken(t)).toHaveLength(64);
	});

	it("different tokens produce different hashes", () => {
		expect(hashManageToken(generateManageToken())).not.toBe(
			hashManageToken(generateManageToken()),
		);
	});
});

describe("eventStatus", () => {
	const start = new Date("2026-11-10T12:00:00Z");
	const end = new Date("2026-11-10T14:00:00Z");

	it("returns upcoming before start", () => {
		expect(getEventStatus(start, end, new Date("2026-11-10T11:00:00Z"))).toBe("upcoming");
	});

	it("returns live between start and end", () => {
		expect(getEventStatus(start, end, new Date("2026-11-10T13:00:00Z"))).toBe("live");
	});

	it("returns ended after end", () => {
		expect(getEventStatus(start, end, new Date("2026-11-10T15:00:00Z"))).toBe("ended");
	});

	it("withEventStatus attaches status", () => {
		const result = withEventStatus({ startTime: start, endTime: end }, new Date("2026-11-10T11:00:00Z"));
		expect(result.status).toBe("upcoming");
	});
});
