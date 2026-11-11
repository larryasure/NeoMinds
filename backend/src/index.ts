// Server entrypoint: validates env, builds the app, starts listening.
// All app wiring lives in app.ts so tests can create the app without binding a port.

import { createApp } from "./app.js";
import { env, assertEnv } from "./config/env.js";

function startServer() {
	// Fail fast if DATABASE_URL or JWT_SECRET is missing
	assertEnv();
	const app = createApp();
	app.listen(env.PORT, () => {
		console.log(`Server is running on port ${env.PORT}`);
	});
}

startServer();
