// Verifies the admin JWT on protected routes and attaches the payload to res.locals.admin.
// Runs before authorize() — only checks "who you are", not "what you may do".

import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

export const authenticate = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const authorization = req.headers.authorization;

	if (!authorization?.startsWith("Bearer ")) {
		return res.status(401).json({
			message: "Authentication required",
		});
	}

	const token = authorization.slice("Bearer ".length);

	try {
		const payload = verifyToken(token);
		(res.locals as Record<string, unknown>).admin = payload;
		next();
	} catch {
		// Expired or tampered token — same message for both so we don't leak why
		return res.status(401).json({
			message: "Invalid or expired token",
		});
	}
};
