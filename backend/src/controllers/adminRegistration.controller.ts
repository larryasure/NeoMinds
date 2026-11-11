// Admin views of registrations: list with filters, single detail, CSV export.
// manageTokenHash is stripped from every response so tokens can't leak.

import type { Request, Response } from "express";
import prisma from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type {
	getAdminRegistrationDto,
	listRegistrationsQueryDto,
} from "../validators/adminRegistration.validator.js";

// Builds the Prisma where clause from optional query filters
function buildWhere(query: listRegistrationsQueryDto): Prisma.RegistrationsWhereInput {
	const where: Prisma.RegistrationsWhereInput = {};
	if (query.status) where.status = query.status;
	if (query.eventId) where.eventId = query.eventId;
	if (query.q) {
		// Case-insensitive search on name OR email
		where.OR = [
			{ name: { contains: query.q, mode: "insensitive" } },
			{ email: { contains: query.q, mode: "insensitive" } },
		];
	}
	return where;
}

// GET /admin/registrations — paginated list
export const listRegistrations = async (req: Request, res: Response) => {
	const query = res.locals.validatedQuery as listRegistrationsQueryDto;
	const where = buildWhere(query);

	// Run count and page fetch in parallel
	const [items, total] = await Promise.all([
		prisma.registrations.findMany({
			where,
			include: {
				event: { select: { id: true, title: true, startTime: true, endTime: true } },
			},
			orderBy: { createdAt: "desc" },
			skip: (query.page - 1) * query.limit,
			take: query.limit,
		}),
		prisma.registrations.count({ where }),
	]);

	// Omit manageTokenHash from every item (destructuring rename drops it)
	return res.status(200).json({
		items: items.map(({ manageTokenHash: _omit, ...rest }) => rest),
		total,
		page: query.page,
		limit: query.limit,
	});
};

// GET /admin/registrations/:id — full detail with event and feedback
export const getRegistrationById = async (req: Request, res: Response) => {
	const { id } = res.locals.validatedParams as getAdminRegistrationDto;

	const record = await prisma.registrations.findUnique({
		where: { id },
		include: { event: true, feedback: true },
	});
	if (!record) return res.status(404).json({ message: "Registration not found" });

	const { manageTokenHash: _omit, ...rest } = record;
	return res.status(200).json(rest);
};

// Escape a CSV cell: wrap in quotes if it contains comma, quote, or newline
function csvEscape(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = value instanceof Date ? value.toISOString() : String(value);
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

// GET /admin/registrations/export — full CSV download (ignores page/limit)
export const exportRegistrations = async (req: Request, res: Response) => {
	const query = res.locals.validatedQuery as listRegistrationsQueryDto;
	const where = buildWhere(query);

	const items = await prisma.registrations.findMany({
		where,
		include: {
			event: { select: { id: true, title: true, startTime: true, endTime: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	const headers = [
		"id",
		"name",
		"email",
		"phone",
		"status",
		"eventId",
		"eventTitle",
		"eventStartTime",
		"eventEndTime",
		"createdAt",
		"updatedAt",
	];

	const rows = items.map((r) =>
		[
			r.id,
			r.name,
			r.email,
			r.phone,
			r.status,
			r.eventId,
			r.event.title,
			r.event.startTime,
			r.event.endTime,
			r.createdAt,
			r.updatedAt,
		]
			.map(csvEscape)
			.join(","),
	);

	// CRLF line endings per RFC 4180 (Excel-friendly)
	const csv = [headers.join(","), ...rows].join("\r\n");

	res.setHeader("Content-Type", "text/csv; charset=utf-8");
	res.setHeader(
		"Content-Disposition",
		'attachment; filename="registrations.csv"',
	);
	return res.status(200).send(csv);
};
