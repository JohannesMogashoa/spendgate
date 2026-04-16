import { RuleCondition, SimulationResult, SpendRule, Transaction } from "./types";

/**
 * Evaluate a set of conditions against a resolved transaction context.
 */
function evalConditions(
    conditions: RuleCondition[],
    ctx: { amount: number; merchant: string; hour: number }
): boolean {
    return conditions.every((cond) => {
        const { field, op, value } = cond;
        const actual = ctx[field];

        if (field === "merchant" && op === "contains") {
            return String(actual).includes(String(value).toLowerCase());
        }

        const numVal = Number(value);
        switch (op) {
            case "gt":
                return (actual as number) > numVal;
            case "lt":
                return (actual as number) < numVal;
            case "gte":
                return (actual as number) >= numVal;
            case "lte":
                return (actual as number) <= numVal;
            case "eq":
                if (field === "merchant") return String(actual) === String(value).toLowerCase();
                return (actual as number) === numVal;
            default:
                return false;
        }
    });
}

/**
 * Simulate running the rule engine against a transaction.
 * Returns the final decision, which rules were triggered, and which actions fired.
 */
export function simulateTransaction(
    transaction: Transaction,
    rules: SpendRule[]
): SimulationResult {
    const ctx = {
        amount: transaction.centsAmount / 100,
        merchant: transaction.merchant?.name?.toLowerCase?.() ?? "",
        hour: new Date(transaction.dateTime).getHours(),
    };

    const active = rules.filter((r) => r.active).sort((a, b) => a.priority - b.priority);

    const triggeredRules: string[] = [];
    const actions: string[] = [];
    let decision: "allowed" | "blocked" = "allowed";

    for (const rule of active) {
        if (!evalConditions(rule.conditions, ctx)) continue;

        triggeredRules.push(rule.label);

        for (const action of rule.actions) {
            if (action.type === "block") {
                actions.push(`Blocked by "${rule.label}"`);
                decision = "blocked";
                return { decision, triggeredRules, actions };
            } else if (action.type === "notify") {
                actions.push(`Notify via ${action.channel ?? "push"} — "${rule.label}"`);
            }
        }

        if (rule.stopProcessing) break;
    }

    return { decision, triggeredRules, actions };
}

/**
 * Build a human-readable English summary of a rule.
 */
export function ruleSummary(rule: SpendRule): string {
    if (rule.conditions.length === 0) return "No conditions set.";

    const condParts = rule.conditions.map((c) => {
        if (c.field === "amount") return `amount ${c.op} R${c.value}`;
        if (c.field === "merchant" && c.op === "contains") return `merchant contains "${c.value}"`;
        if (c.field === "merchant") return `merchant ${c.op} "${c.value}"`;
        if (c.field === "hour") return `hour ${c.op} ${c.value}`;
        return "";
    });

    const actionParts = rule.actions.map((a) =>
        a.type === "block" ? "block" : `notify via ${a.channel ?? "push"}`
    );

    return `If ${condParts.join(" AND ")}, then ${actionParts.join(" and ")}.`;
}
