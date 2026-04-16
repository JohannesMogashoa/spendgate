import { NextRequest, NextResponse } from "next/server";
import { investecFetch } from "@/lib/investec-client";

/**
 * GET /api/transactions
 *
 * Fetch user's transaction history from Investec.
 * Returns last 90 days of transactions for the first account.
 * Useful for analyzing spending patterns and suggesting rules.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
    try {
        // Note: In production (Phase 9+), this would use session + user model
        // For MVP, anyone can call this endpoint. Add auth before deploying.

        // Step 1: Get list of user's accounts
        const accountsRes = await investecFetch("/za/pb/v1/accounts");

        if (!accountsRes.ok) {
            const err = await accountsRes.text().catch(() => "unknown error");
            return NextResponse.json(
                { error: `Failed to fetch accounts: ${err}` },
                { status: 502 }
            );
        }

        const accountsData = (await accountsRes.json()) as {
            data?: { accounts?: Array<{ accountId: string }> };
        };
        const accounts = accountsData.data?.accounts ?? [];

        if (!accounts.length) {
            // No accounts found — return empty list instead of error
            return NextResponse.json({ transactions: [] });
        }

        const accountId = accounts[0].accountId;

        // Step 2: Fetch transactions for the last 90 days
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const fromDate = ninetyDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD
        const toDate = now.toISOString().split("T")[0];

        const txRes = await investecFetch(
            `/za/pb/v1/accounts/${accountId}/transactions?fromDate=${fromDate}&toDate=${toDate}`
        );

        if (!txRes.ok) {
            const err = await txRes.text().catch(() => "unknown error");
            return NextResponse.json(
                { error: `Failed to fetch transactions: ${err}` },
                { status: 502 }
            );
        }

        const txData = (await txRes.json()) as {
            data?: { transactions?: unknown[] };
        };
        const transactions = txData.data?.transactions ?? [];

        // Sort by transaction date descending (newest first)
        const sorted = (transactions as Array<{ transactionDate?: string }>).sort((a, b) => {
            const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
            const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({ transactions: sorted, accountId, fromDate, toDate });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[transactions] Error:", message);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}
