// Creates the first SUPER_ADMIN from .env on first run (idempotent upsert).
// Run with: pnpm db:seed
// Password is bcrypt-hashed here so plaintext never lands in the database.

import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma";
import { env } from "../src/config/env";

async function main() {
	const email = env.SUPER_ADMIN_EMAIL;
	const password = env.SUPER_ADMIN_PASSWORD;
	const name = env.SUPER_ADMIN_NAME;

	if (!email || !password || !name) {
		throw new Error("Super admin credentials missing");
	}

	const hashedPassword = await bcrypt.hash(password, 12);

	// update: {} → do nothing if the admin already exists
	await prisma.admin.upsert({
		where: { email },
		update: {},
		create: {
			email,
			password: hashedPassword,
			name,
			role: "SUPER_ADMIN",
		},
	});

	console.log("Initial Super admin created or already exists");
}

main()
	.catch(console.error)
	.finally(async () => {
		await prisma.$disconnect();
	});
