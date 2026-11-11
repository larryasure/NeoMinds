// JWT issue/verify for admin auth.
// Tokens carry userId + role and expire in 15 minutes — short-lived so a leaked
// token window is small. There is no refresh token; admins re-login.

import jwt from "jsonwebtoken";
import { AdminRole } from "../generated/prisma/enums.js";
import { env } from "../config/env.js";

export interface JwtPayload {
	userId: string;
	role: AdminRole;
}

// Fail fast outside tests if the secret was never configured
if (!env.JWT_SECRET && !env.isTest) {
	throw new Error("JWT_SECRET is not configured");
}

// Vitest sets JWT_SECRET via vitest.config.ts; this fallback only exists for tests
const JWT_SECRET = env.JWT_SECRET || "test-secret";

export const generateToken = (userId: string, role: AdminRole): string => {
	return jwt.sign({ userId, role }, JWT_SECRET, {
		expiresIn: "15m",
		algorithm: "HS256",
	});
};

// Rejects tampered/expired tokens and malformed payloads before they reach controllers
export const verifyToken = (token: string): JwtPayload => {
	const payload = jwt.verify(token, JWT_SECRET, {
		algorithms: ["HS256"],
	});

	if (
		typeof payload === "string" ||
		typeof payload.userId !== "string" ||
		typeof payload.role !== "string"
	) {
		throw new Error("Invalid token payload");
	}

	return { userId: payload.userId, role: payload.role as AdminRole };
};
