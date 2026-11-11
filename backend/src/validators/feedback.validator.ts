// Zod schemas for feedback submission and reading.
// Enums must match prisma/schema.prisma (ConversationValue, Attendance, Volunteer).

import { z } from "zod";
import {
	AttendanceEnum,
	ConversationValueEnum,
	VolunteerEnum,
} from "../generated/prisma/enums.js";

export const getEventFeedbackSchema = z.object({
	eventId: z.uuid("Invalid event id"),
});

// POST /feedback — every field is required
export const createFeedbackSchema = z.object({
	eventId: z.uuid("Invalid event id"),
	registrationId: z.uuid("Invalid registration id"),
	rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
	conversationValue: z.enum(ConversationValueEnum),
	usefulPart: z.string().min(1, "Useful part is required").max(2000),
	futureImprovements: z.string().min(1, "Future improvements are required").max(2000),
	recommendedTopics: z.string().min(1, "Recommended topics are required").max(2000),
	attendance: z.enum(AttendanceEnum),
	volunteer: z.enum(VolunteerEnum),
});

export type getEventFeedbackDto = z.infer<typeof getEventFeedbackSchema>;
export type createFeedbackDto = z.infer<typeof createFeedbackSchema>;
