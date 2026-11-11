// Loads the static OpenAPI spec from docs/ and configures Swagger UI.
// Spec is read once at startup so a bad/missing file crashes boot instead of failing at request time.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SwaggerUiOptions } from "swagger-ui-express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = join(__dirname, "..", "docs", "openapi.json");

function loadSpec(): Record<string, unknown> {
	try {
		const raw = readFileSync(specPath, "utf8");
		return JSON.parse(raw) as Record<string, unknown>;
	} catch (err) {
		throw new Error(
			`Failed to load OpenAPI spec at ${specPath}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

export const openapiSpec = loadSpec();

export const swaggerUiOptions: SwaggerUiOptions = {
	// Hide Swagger's default topbar branding
	customCss: ".swagger-ui .topbar { display: none }",
	customSiteTitle: "NeoMinds Live API Docs",
	swaggerOptions: {
		// Start with operations collapsed as a list (not expanded)
		docExpansion: "list",
		// Keep the Authorization header after a page reload while testing
		persistAuthorization: true,
	},
};
