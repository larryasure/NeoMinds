// Zod validation for request body, path params, and query string.
// On failure: 400 with a field-by-field errors array.
// On success: replaces req.body with parsed data, or stores parsed values on
// res.locals (params/query) so controllers only see validated input.

import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

function sendValidationErrors(res: Response, error: z.ZodError) {
	return res.status(400).json({
		message: "Invalid request",
		errors: error.issues.map((issue) => ({
			field: issue.path.join("."),
			message: issue.message,
		})),
	});
}

export const validateRequestBody = (schema: z.ZodType) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			return sendValidationErrors(res, result.error);
		}
		req.body = result.data;
		next();
	};
};

export const validateRequestParam = (schema: z.ZodType) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.params);

		if (!result.success) {
			return sendValidationErrors(res, result.error);
		}
		res.locals.validatedParams = result.data;
		next();
	};
};

export const validateRequestQuery = (schema: z.ZodType) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.query);

		if (!result.success) {
			return sendValidationErrors(res, result.error);
		}
		res.locals.validatedQuery = result.data;
		next();
	};
};
