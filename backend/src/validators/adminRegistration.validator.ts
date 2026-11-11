// Query/param schemas for admin registration endpoints.
// z.coerce turns query strings ("2") into numbers before validation.

import { z } from "zod";
import { RegistrationStatus } from "../generated/prisma/enums.js";

// Shared by GET list and GET export (export ignores page/limit)
export const listRegistrationsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	status: z.enum(RegistrationStatus).optional(),
	eventId: z.uuid("Invalid event id").optional(),
	// Free-text search on name or email
	q: z.string().trim().min(1).max(200).optional(),
});

export const getAdminRegistrationSchema = z.object({
	id: z.uuid("Invalid registration id"),
});

export type listRegistrationsQueryDto = z.infer<typeof listRegistrationsQuerySchema>;
export type getAdminRegistrationDto = z.infer<typeof getAdminRegistrationSchema>;
