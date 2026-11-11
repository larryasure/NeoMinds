// Admin authentication and creation of normal admin accounts.
// Login is public; create-admin is SUPER_ADMIN-only (enforced in admin.routes.ts).

import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/jwt.js";
import { adminLoginDto, createAdminDto } from "../validators/admin.validator.js";

// POST /admin/login — returns a 15-minute JWT
export const login = async (req: Request, res: Response) => {
	const { email, password } = req.body as adminLoginDto;

	const admin = await prisma.admin.findUnique({ where: { email } });
	// Same message for unknown email and wrong password — no user enumeration
	if (!admin) {
		return res.status(401).json({ message: "Invalid email or password" });
	}

	const valid = await bcrypt.compare(password, admin.password);
	if (!valid) {
		return res.status(401).json({ message: "Invalid email or password" });
	}

	const token = generateToken(admin.id, admin.role);

	return res.status(200).json({
		token,
		admin: {
			id: admin.id,
			name: admin.name,
			email: admin.email,
			role: admin.role,
		},
	});
};

// POST /admin/admins — SUPER_ADMIN only; can only create role ADMIN (see validator)
export const createAdmin = async (req: Request, res: Response) => {
	const { name, email, password, role } = req.body as createAdminDto;

	const existing = await prisma.admin.findUnique({ where: { email } });
	if (existing) {
		return res.status(409).json({ message: "An admin with this email already exists" });
	}

	// Cost 12 matches prisma/seed.ts so all password hashes are consistent
	const hashedPassword = await bcrypt.hash(password, 12);
	const admin = await prisma.admin.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role,
		},
	});

	// Never return the password hash
	return res.status(201).json({
		id: admin.id,
		name: admin.name,
		email: admin.email,
		role: admin.role,
	});
};
