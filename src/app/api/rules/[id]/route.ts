import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await req.json();

		const rule = await prisma.spendRule.update({
			where: { id },
			data: {
				...(body.label !== undefined && { label: body.label }),
				...(body.active !== undefined && { active: body.active }),
				...(body.priority !== undefined && { priority: body.priority }),
				...(body.stopProcessing !== undefined && {
					stopProcessing: body.stopProcessing,
				}),
				...(body.conditions !== undefined && {
					conditions: body.conditions,
				}),
				...(body.actions !== undefined && { actions: body.actions }),
			},
		});

		return NextResponse.json(rule);
	} catch {
		return NextResponse.json(
			{ error: "Failed to update rule" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		await prisma.spendRule.delete({ where: { id } });
		return new NextResponse(null, { status: 204 });
	} catch {
		return NextResponse.json(
			{ error: "Failed to delete rule" },
			{ status: 500 },
		);
	}
}
