// Feedback routes: public submit, admin-only read.

import { Router } from "express";
import {
	validateRequestBody,
	validateRequestParam,
} from "../middlewares/validate.middleware.js";
import {
	createFeedback,
	getEventFeedback,
} from "../controllers/feedback.controller.js";
import {
	createFeedbackSchema,
	getEventFeedbackSchema,
} from "../validators/feedback.validator.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorization.middleware.js";

const router = Router();

router.post("/", validateRequestBody(createFeedbackSchema), createFeedback);
router.get(
	"/:eventId",
	authenticate,
	authorize("SUPER_ADMIN", "ADMIN"),
	validateRequestParam(getEventFeedbackSchema),
	getEventFeedback,
);

export default router;
