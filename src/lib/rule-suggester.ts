/**
 * Rule suggestion engine — generates smart rule suggestions from transactions.
 * Uses deterministic logic (no LLM) for fast, explainable suggestions.
 */

import type { SpendRule, InvestecTransaction } from "./types";

export type RuleSuggestion = Omit<SpendRule, "id" | "active" | "priority" | "stopProcessing"> & {
    label: string;
    description: string; // shown in suggestion modal
};

/**
 * Generate 2–3 rule suggestions from a transaction.
 *
 * Strategies:
 * 1. Block this merchant (from description/first word)
 * 2. Warn on amount above this transaction
 * 3. Block this merchant after hours (if late night transaction)
 * 4. Cap monthly spend (if large debit)
 */
export function suggestRulesFromTransaction(tx: InvestecTransaction): RuleSuggestion[] {
    const suggestions: RuleSuggestion[] = [];
    const merchantName = tx.description ?? "";
    const amount = Math.abs(tx.amount);
    const date = new Date(tx.transactionDate);
    const hour = date.getHours();
    const displayShortName = merchantName.split(" ")[0]?.trim() ?? "";
    const normalizedShortName = displayShortName.toLowerCase();

    // Round up to nearest R50 for cleaner rule thresholds
    const roundedAmount = Math.ceil(amount / 50) * 50;

    // Suggestion 1: Block this exact merchant
    if (merchantName) {
        if (normalizedShortName.length > 2) {
            // avoid single-letter merchant names
            suggestions.push({
                label: `Block ${displayShortName}`,
                description: `Decline any future charges from "${displayShortName}"`,
                conditions: [
                    {
                        field: "merchant",
                        op: "contains",
                        value: normalizedShortName,
                    },
                ],
                actions: [{ type: "block" }],
            });
        }
    }

    // Suggestion 2: Warn on amount above this transaction's value
    suggestions.push({
        label: `Warn me above R${roundedAmount}`,
        description: `Notify when any charge exceeds R${roundedAmount}`,
        conditions: [
            {
                field: "amount",
                op: "gt",
                value: roundedAmount,
            },
        ],
        actions: [{ type: "notify", channel: "push" }],
    });

    // Suggestion 3: Block this merchant after hours (if transaction was late)
    if (hour >= 20 && merchantName) {
        if (normalizedShortName.length > 2) {
            suggestions.push({
                label: `Block ${displayShortName} after 8pm`,
                description: `Prevent late-night charges from "${displayShortName}"`,
                conditions: [
                    { field: "merchant", op: "contains", value: normalizedShortName },
                    { field: "hour", op: "gte", value: 20 },
                ],
                actions: [{ type: "block" }],
            });
        }
    }

    // Suggestion 4: Cap monthly spend (if large debit)
    if (tx.type === "DEBIT" && amount > 200) {
        const monthlyThreshold = roundedAmount * 3;
        suggestions.push({
            label: `Cap monthly spend above R${monthlyThreshold}`,
            description: `Block charges once you've spent R${monthlyThreshold} in a calendar month`,
            conditions: [
                {
                    field: "amount",
                    op: "gt",
                    value: monthlyThreshold,
                },
            ],
            actions: [{ type: "block" }],
        });
    }

    // Return top 3
    return suggestions.slice(0, 3);
}

/**
 * Generate human-readable English summary of a rule.
 * (Not currently used in UI, but kept for future expansion)
 */
export function ruleSummaryText(rule: Omit<SpendRule, "id">): string {
    if (rule.conditions.length === 0) return "No conditions set.";

    const condParts = rule.conditions.map((c) => {
        if (c.field === "amount") {
            return `amount ${c.op} R${c.value}`;
        }
        if (c.field === "merchant") {
            if (c.op === "contains") return `merchant contains "${c.value}"`;
            return `merchant ${c.op} "${c.value}"`;
        }
        if (c.field === "hour") {
            return `hour ${c.op} ${c.value}`;
        }
        return "";
    });

    const actionParts = rule.actions.map((a) => {
        if (a.type === "block") return "block";
        return `notify (${a.channel ?? "push"})`;
    });

    return `If ${condParts.join(" AND ")}, then ${actionParts.join(" and ")}.`;
}
