import { NextRequest, NextResponse } from "next/server";
import { RuleAction, RuleCondition, SpendRule } from "@/lib/types";

import { compileRules } from "@/lib/compiler";
import { prisma } from "@/lib/prisma";

function toSpendRule(row: {
	id: string;
	label: string;
	active: boolean;
	priority: number;
	stopProcessing: boolean;
	conditions: unknown;
	actions: unknown;
}): SpendRule {
	return {
		id: row.id,
		label: row.label,
		active: row.active,
		priority: row.priority,
		stopProcessing: row.stopProcessing,
		conditions: row.conditions as RuleCondition[],
		actions: row.actions as RuleAction[],
	};
}

export async function POST(req: NextRequest) {
	try {
		// Accept optional inline rules for preview; otherwise compile all DB rules
		const body = await req.json().catch(() => ({}));
		const inlineRules: SpendRule[] | undefined = body.rules;

		const rules: SpendRule[] = inlineRules
			? inlineRules
			: (
					await prisma.spendRule.findMany({
						orderBy: { priority: "asc" },
					})
				).map(toSpendRule);

		const code = compileRules(rules);
		return NextResponse.json({ code });
	} catch {
		return NextResponse.json(
			{ error: "Compilation failed" },
			{ status: 500 },
		);
	}
}
