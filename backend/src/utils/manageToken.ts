// Manage tokens let users update/cancel a registration without an account.
// We generate a random token, return it once to the client, and store only its
// SHA-256 hash — so a DB leak cannot be used to cancel someone else's registration.

import { createHash, randomBytes } from "node:crypto";

export function generateManageToken(): string {
	// 32 random bytes → 43-char base64url string
	return randomBytes(32).toString("base64url");
}

export function hashManageToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}
