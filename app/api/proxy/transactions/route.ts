import { NextRequest } from "next/server";
import { investecFetch } from "@/lib/investec-client";
import { extractCredentials } from "@/lib/credentials";
import { corsJson } from "@/lib/cors";

/**
 * GET /api/transactions
 *
 * Fetch user's transaction history from Investec.
 * Returns last 90 days of transactions for the first account.
 * Useful for analyzing spending patterns and suggesting rules.
 */
export async function GET(req: NextRequest) {
    try {
        const sandbox = req.nextUrl.searchParams.get("sandbox") === "true";
        const creds = extractCredentials(req);

        // Step 1: Get list of user's accounts
        const acctRes = await investecFetch("/za/pb/v1/accounts", creds, { sandbox });
        if (!acctRes.ok) {
            return corsJson({ error: "Failed to fetch accounts" }, acctRes.status);
        }
        const {
            data: { accounts },
        } = await acctRes.json();
        const accountId = accounts?.[0]?.accountId;
        if (!accountId) {
            return corsJson({ transactions: [] });
        }

        // Step 2: Fetch transactions for the last 90 days
        const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const to = new Date().toISOString().split("T")[0];

        const txRes = await investecFetch(
            `/za/pb/v1/accounts/${accountId}/transactions?fromDate=${from}&toDate=${to}`,
            creds,
            { sandbox }
        );
        const txData = await txRes.json();

        const sorted = (txData as Array<{ transactionDate?: string }>).sort((a, b) => {
            const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
            const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
            return dateB - dateA;
        });

        return corsJson(
            { transactions: sorted, accountId, fromDate: from, toDate: to },
            txRes.ok ? 200 : txRes.status
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[transactions] Error:", message);
        return corsJson({ success: false, error: "Failed to fetch transactions" }, 500);
    }
}
