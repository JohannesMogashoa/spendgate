import { NextRequest, NextResponse } from "next/server";
import { RuleAction, RuleCondition, SpendRule, Transaction } from "@/lib/types";

import { prisma } from "@/lib/prisma";
import { simulateTransaction } from "@/lib/simulator";

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
        const body: { transaction: Transaction; rules?: SpendRule[] } = await req.json();

        if (!body.transaction?.centsAmount || !body.transaction?.dateTime) {
            return NextResponse.json({ error: "Invalid transaction payload" }, { status: 400 });
        }

        const rules: SpendRule[] = body.rules
            ? body.rules
            : (
                  await prisma.spendRule.findMany({
                      orderBy: { priority: "asc" },
                  })
              ).map(toSpendRule);

        const result = simulateTransaction(body.transaction, rules);
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
    }
}
