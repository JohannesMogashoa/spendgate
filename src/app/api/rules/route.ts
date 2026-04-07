import { NextRequest, NextResponse } from "next/server";

import { SpendRule } from "@/lib/types";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const rules = await prisma.spendRule.findMany({
			orderBy: { priority: "asc" },
		});
		return NextResponse.json(rules);
	} catch {
		return NextResponse.json(
			{ error: "Failed to fetch rules" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body: Omit<SpendRule, "id"> = await req.json();

		if (
			!body.label ||
			!Array.isArray(body.conditions) ||
			!Array.isArray(body.actions)
		) {
			return NextResponse.json(
				{ error: "Invalid rule payload" },
				{ status: 400 },
			);
		}

		const rule = await prisma.spendRule.create({
			data: {
				label: body.label,
				active: body.active ?? true,
				priority: body.priority ?? 0,
				stopProcessing: body.stopProcessing ?? false,
				conditions: body.conditions,
				actions: body.actions,
			},
		});

		return NextResponse.json(rule, { status: 201 });
	} catch {
		return NextResponse.json(
			{ error: "Failed to create rule" },
			{ status: 500 },
		);
	}
}
