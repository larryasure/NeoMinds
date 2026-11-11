// Registration self-service routes. All public except update/cancel which need
// the X-Manage-Token header (checked in the controller, not here).

import { Router } from "express";
import {
	cancelRegistration,
	createRegistration,
	getRegistration,
	updateRegistration,
} from "../controllers/user.controller.js";
import {
	validateRequestBody,
	validateRequestParam,
} from "../middlewares/validate.middleware.js";
import {
	createRegistrationSchema,
	getRegistrationSchema,
	updateRegistrationSchema,
} from "../validators/registration.validator.js";

const router = Router();

// Token in the path — validate length before hitting the DB
router.get(
	"/:manageToken",
	validateRequestParam(getRegistrationSchema),
	getRegistration,
);
router.post(
	"/",
	validateRequestBody(createRegistrationSchema),
	createRegistration,
);
router.patch(
	"/",
	validateRequestBody(updateRegistrationSchema),
	updateRegistration,
);
// No body schema — only the manage token header is required
router.delete("/", cancelRegistration);

export default router;
