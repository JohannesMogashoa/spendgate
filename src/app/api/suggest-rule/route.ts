import { NextRequest, NextResponse } from "next/server";
import { suggestRulesFromTransaction } from "@/lib/rule-suggester";
import type { InvestecTransaction } from "@/lib/types";

/**
 * POST /api/suggest-rule
 *
 * Generate rule suggestions from a transaction.
 * Called when user clicks "Create rule" on a transaction in the UI.
 */
export async function POST(req: NextRequest) {
    try {
        const transaction = (await req.json().catch(() => ({}))) as
            | InvestecTransaction
            | Record<string, unknown>;

        if (!transaction.transactionDate || transaction.amount === undefined) {
            return NextResponse.json({ error: "Invalid transaction payload" }, { status: 400 });
        }

        const suggestions = suggestRulesFromTransaction(transaction as InvestecTransaction);

        return NextResponse.json({ suggestions });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[suggest-rule] Error:", message);
        return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
    }
}
