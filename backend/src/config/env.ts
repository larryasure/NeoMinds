// Central place for all environment variables.
// Import env from here instead of reading process.env directly so config stays in one spot.

import "dotenv/config";

export const env = {
	NODE_ENV: process.env.NODE_ENV ?? "development",
	PORT: Number(process.env.PORT) || 3000,
	DATABASE_URL: process.env.DATABASE_URL ?? "",
	JWT_SECRET: process.env.JWT_SECRET ?? "",
	// Used only by prisma/seed.ts to create the first super admin
	SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL ?? "",
	SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD ?? "",
	SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME ?? "",
	get isTest() {
		return this.NODE_ENV === "test";
	},
} as const;

// Called once at server startup — stops boot with a clear message if critical vars are missing
export function assertEnv() {
	const missing: string[] = [];
	if (!env.DATABASE_URL) missing.push("DATABASE_URL");
	if (!env.JWT_SECRET) missing.push("JWT_SECRET");
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}
}
