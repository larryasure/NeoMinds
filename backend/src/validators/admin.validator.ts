// Zod schemas for admin login and admin creation.
// role is a literal ADMIN: super admins cannot mint other super admins.

import { z } from "zod";
import { AdminRole } from "../generated/prisma/enums.js";

export const adminLoginSchema = z.object({
	email: z.email("Invalid email"),
	password: z.string().min(1, "Password is required"),
});

export const createAdminSchema = z.object({
	name: z.string("Invalid name").min(2, "Name must be at least 2 characters"),
	email: z.email("Invalid email"),
	// Min 8 to match a basic password policy; hashed with bcrypt cost 12
	password: z
		.string()
		.min(8, "Password must be at least 8 characters"),
	role: z.literal(AdminRole.ADMIN).default(AdminRole.ADMIN),
});

export type adminLoginDto = z.infer<typeof adminLoginSchema>;
export type createAdminDto = z.infer<typeof createAdminSchema>;
