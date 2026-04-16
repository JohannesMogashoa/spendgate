import { NextRequest, NextResponse } from "next/server";
import { RuleAction, RuleCondition, SpendRule } from "@/lib/types";

import { compileRules } from "@/lib/compiler";
import { deployRulesToCard } from "@/lib/cardDeployer";
import { prisma } from "@/lib/prisma";

type RuleRow = {
    id: string;
    label: string;
    active: boolean;
    priority: number;
    stopProcessing: boolean;
    conditions: unknown;
    actions: unknown;
};

function toSpendRule(row: RuleRow): SpendRule {
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

/**
 * Deploy all active rules for a given card key.
 * Used as the central redeploy trigger on all rule mutations.
 * POST body: { cardKey: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as {
            cardKey?: string;
        };

        const cardKey = body.cardKey?.trim();
        if (!cardKey) {
            return NextResponse.json({ error: "cardKey is required" }, { status: 400 });
        }

        // Load all active rules from DB, sorted by priority
        const rules = (
            await prisma.spendRule.findMany({
                where: { active: true },
                orderBy: { priority: "asc" },
            })
        ).map(toSpendRule);

        const compiledCode = compileRules(rules);
        const result = await deployRulesToCard(cardKey, compiledCode);

        return NextResponse.json(
            { ...result, compiledCode },
            { status: result.success ? 200 : 502 }
        );
    } catch {
        return NextResponse.json({ error: "Deployment failed" }, { status: 500 });
    }
}
