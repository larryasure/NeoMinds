// Admin routes: login (public), create-admin (SUPER_ADMIN only), registration management.
// Auth runs before validation on protected routes.

import { Router } from "express";
import { validateRequestBody } from "../middlewares/validate.middleware.js";
import { adminLoginSchema, createAdminSchema } from "../validators/admin.validator.js";
import { createAdmin, login } from "../controllers/admin.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";
import {
	exportRegistrations,
	getRegistrationById,
	listRegistrations,
} from "../controllers/adminRegistration.controller.js";
import {
	getAdminRegistrationSchema,
	listRegistrationsQuerySchema,
} from "../validators/adminRegistration.validator.js";
import {
	validateRequestParam,
	validateRequestQuery,
} from "../middlewares/validate.middleware.js";

const router = Router();

// Public — no token required to log in
router.post("/login", validateRequestBody(adminLoginSchema), login);

// SUPER_ADMIN only — ADMIN role gets 403
router.post(
	"/admins",
	authenticate,
	authorize("SUPER_ADMIN"),
	validateRequestBody(createAdminSchema),
	createAdmin,
);

// Both admin roles can manage registrations
const adminGuard = [authenticate, authorize("SUPER_ADMIN", "ADMIN")];

router.get(
	"/registrations",
	adminGuard,
	validateRequestQuery(listRegistrationsQuerySchema),
	listRegistrations,
);
// Export must be registered before /:id so "export" isn't parsed as a uuid
router.get(
	"/registrations/export",
	adminGuard,
	validateRequestQuery(listRegistrationsQuerySchema),
	exportRegistrations,
);
router.get(
	"/registrations/:id",
	adminGuard,
	validateRequestParam(getAdminRegistrationSchema),
	getRegistrationById,
);

export default router;
