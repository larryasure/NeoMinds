// Role check factory — use after authenticate so res.locals.admin is set.
// Example: authorize("SUPER_ADMIN") or authorize("SUPER_ADMIN", "ADMIN").
// Fails closed: no admin on the request → 403.

import type { Request, Response, NextFunction } from "express";
import type { AdminRole } from "../generated/prisma/enums.js";
import type { JwtPayload } from "../utils/jwt.js";

export const authorize = (...roles: AdminRole[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const admin = (res.locals as Record<string, unknown>).admin as
			| JwtPayload
			| undefined;

		if (!admin || !roles.includes(admin.role)) {
			return res.status(403).json({
				message: "You don't have permission to perform this action",
			});
		}

		next();
	};
};
