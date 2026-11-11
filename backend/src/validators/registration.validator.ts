// Zod schemas for registration requests.
// Body schemas are used by validateRequestBody; param schemas by validateRequestParam.
// Types (createRegistrationDto etc.) are what controllers cast res.locals / req.body to.

import { z } from "zod";

// GET /user/event/:manageToken
export const getRegistrationSchema = z.object({
	manageToken: z.string().min(32, "Invalid manage token"),
});

// POST /user/event — phone is optional (stored as null when omitted)
export const createRegistrationSchema = z.object({
	name: z.string("Invalid name").min(2, "Name must be at least 2 characters"),
	email: z.email("Invalid email address"),
	phone: z
		.string()
		.min(7, "Phone number must be at least 7 characters")
		.max(20, "Phone number must be at most 20 characters")
		.optional(),
	eventId: z.uuid("Invalid event id"),
});

// PATCH /user/event — all fields optional; controller rejects an empty object
export const updateRegistrationSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").optional(),
	email: z.email("Invalid email address").optional(),
	phone: z
		.string()
		.min(7, "Phone number must be at least 7 characters")
		.max(20, "Phone number must be at most 20 characters")
		.optional(),
});

export type getRegistrationDto = z.infer<typeof getRegistrationSchema>;
export type createRegistrationDto = z.infer<typeof createRegistrationSchema>;
export type editRegistrationDto = z.infer<typeof updateRegistrationSchema>;
