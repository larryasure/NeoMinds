// Event routes. Literal paths (/latest, /previous) are registered before /:id
// so they are never captured as an id. Mutations require an admin JWT.

import { Router } from "express";
import {
	createEvent,
	deleteEvent,
	getEventById,
	getEvents,
	getLatestEvent,
	getPreviousEvents,
	updateEvent,
} from "../controllers/events.controller.js";
import {
	validateRequestBody,
	validateRequestParam,
	validateRequestQuery,
} from "../middlewares/validate.middleware.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";
import {
	createEventSchema,
	deleteEventSchema,
	getEventSchema,
	listPreviousEventsSchema,
	updateEventSchema,
} from "../validators/event.validator.js";

const router = Router();
// Shared guard for create/update/delete: both admin roles allowed
const adminOnly = [authenticate, authorize("SUPER_ADMIN", "ADMIN")];

// --- Public reads ---
router.get("/latest", getLatestEvent);
router.get(
	"/previous",
	validateRequestQuery(listPreviousEventsSchema),
	getPreviousEvents,
);
router.get("/:id", validateRequestParam(getEventSchema), getEventById);
router.get("/", getEvents);

// --- Admin mutations (auth runs before validation → 401 beats 400) ---
router.post(
	"/",
	adminOnly,
	validateRequestBody(createEventSchema),
	createEvent,
);
router.patch(
	"/",
	adminOnly,
	validateRequestBody(updateEventSchema),
	updateEvent,
);
router.delete(
	"/",
	adminOnly,
	validateRequestBody(deleteEventSchema),
	deleteEvent,
);

export default router;
