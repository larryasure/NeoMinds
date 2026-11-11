// Final middleware chain: unmatched routes → 404; anything thrown → JSON error response.
// Registered last in app.ts so every request ends here.

import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

// Optional helper for controllers that want to throw typed HTTP errors
export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
	}
}

// No route matched — Express 5 still needs an explicit 404 handler for JSON APIs
export function notFoundHandler(req: Request, res: Response) {
	res.status(404).json({ message: "Not found" });
}

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) {
	if (err instanceof HttpError) {
		return res.status(err.status).json({ message: err.message });
	}

	// Prisma unique-constraint violation (race between check and insert)
	if (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		(err as { code?: string }).code === "P2002"
	) {
		return res.status(409).json({ message: "Resource already exists" });
	}

	console.error(err);
	// Hide internal error details in production; show them in dev for debugging
	const message =
		env.NODE_ENV === "production" ? "Internal server error" : err instanceof Error ? err.message : "Internal server error";
	res.status(500).json({ message });
}
