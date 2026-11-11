// App factory: builds the Express app without listening on a port.
// Tests import createApp() and use supertest; src/index.ts is the only place that listens.

import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import userRoutes from "./routes/user.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { env } from "./config/env.js";
import { openapiSpec, swaggerUiOptions } from "./swagger.js";

export function createApp() {
	const app = express();

	// Security headers. CSP allows inline styles because Swagger UI needs them;
	// scripts stay same-origin only so /docs cannot load third-party JS.
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'"],
					imgSrc: ["'self'", "data:"],
				},
			},
			crossOriginEmbedderPolicy: false,
		}),
	);
	app.use(cors());
	app.use(express.json());
	// Skip request logging in tests to keep output clean
	if (!env.isTest) {
		app.use(morgan("dev"));
	}

	// Liveness probe for load balancers / container health checks
	app.get("/health", (_req, res) => {
		res.status(200).json({ status: "ok" });
	});

	// API docs: raw OpenAPI spec + interactive Swagger UI
	app.get("/openapi.json", (_req, res) => {
		res.status(200).json(openapiSpec);
	});
	app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, swaggerUiOptions));

	// Feature routers (no global /api prefix — paths match docs/openapi.json)
	app.use("/user/event", userRoutes);
	app.use("/events", eventsRoutes);
	app.use("/admin", adminRoutes);
	app.use("/feedback", feedbackRoutes);

	// Must be registered after all routes: catch unmatched paths, then any thrown errors
	app.use(notFoundHandler);
	app.use(errorHandler);

	return app;
}
