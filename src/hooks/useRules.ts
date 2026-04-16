"use client";

import { RuleAction, RuleCondition, SpendRule } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

import { compileRules } from "@/lib/compiler";

async function getResponseError(response: Response, fallback: string): Promise<string> {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? fallback;
}

function getRuleRequestHeaders(cardKey: string | null, includeJsonContentType: boolean = false) {
    return {
        ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
        ...(cardKey ? { "x-card-key": cardKey } : {}),
    };
}

function toSpendRule(row: Record<string, unknown>): SpendRule {
    return {
        id: row.id as string,
        label: row.label as string,
        active: row.active as boolean,
        priority: row.priority as number,
        stopProcessing: row.stopProcessing as boolean,
        conditions: row.conditions as RuleCondition[],
        actions: row.actions as RuleAction[],
    };
}

export function useRules() {
    const [rules, setRules] = useState<SpendRule[]>([]);
    const [compiledCode, setCompiledCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deploying, setDeploying] = useState(false);
    const [deployError, setDeployError] = useState<string | null>(null);
    const [lastDeployCodeId, setLastDeployCodeId] = useState<string | null>(null);

    // Recompile whenever rules change
    useEffect(() => {
        setCompiledCode(compileRules(rules));
    }, [rules]);

    const fetchRules = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/rules");
            if (!res.ok) {
                setError("Failed to fetch rules");
                return;
            }

            const data = await res.json();
            setRules((data as Record<string, unknown>[]).map(toSpendRule));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const addRule = useCallback(async (draft: Omit<SpendRule, "id">) => {
        const cardKey = window.localStorage?.getItem("spendgate.cardKey");
        const res = await fetch("/api/rules", {
            method: "POST",
            headers: getRuleRequestHeaders(cardKey, true),
            body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error("Failed to save rule");
        const created = (await res.json()) as Record<string, unknown>;
        setRules((prev) => [...prev, toSpendRule(created)].sort((a, b) => a.priority - b.priority));
    }, []);

    const toggleRule = useCallback(
        async (id: string, active: boolean) => {
            const cardKey = window.localStorage?.getItem("spendgate.cardKey");
            const previousRules = rules;

            setError(null);
            setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, active } : rule)));

            const response = await fetch(`/api/rules/${id}`, {
                method: "PATCH",
                headers: getRuleRequestHeaders(cardKey, true),
                body: JSON.stringify({ active }),
            }).catch((error: unknown) => {
                setRules(previousRules);

                const message = error instanceof Error ? error.message : "Failed to update rule";
                setError(message);
                throw error;
            });

            if (!response.ok) {
                const message = await getResponseError(response, "Failed to update rule");
                setRules(previousRules);
                setError(message);
                return Promise.reject(new Error(message));
            }
        },
        [rules]
    );

    const deleteRule = useCallback(
        async (id: string) => {
            const cardKey = window.localStorage?.getItem("spendgate.cardKey");
            const previousRules = rules;

            setError(null);
            setRules((prev) => prev.filter((rule) => rule.id !== id));

            const response = await fetch(`/api/rules/${id}`, {
                method: "DELETE",
                headers: getRuleRequestHeaders(cardKey),
            }).catch((error: unknown) => {
                setRules(previousRules);

                const message = error instanceof Error ? error.message : "Failed to delete rule";
                setError(message);
                throw error;
            });

            if (!response.ok) {
                const message = await getResponseError(response, "Failed to delete rule");
                setRules(previousRules);
                setError(message);
                return Promise.reject(new Error(message));
            }
        },
        [rules]
    );

    const reorderRule = useCallback(
        async (id: string, direction: "up" | "down") => {
            const sorted = [...rules].sort((a, b) => a.priority - b.priority);
            const idx = sorted.findIndex((rule) => rule.id === id);
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;

            if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) {
                return;
            }

            setError(null);

            const updated = sorted.map((rule, index) => {
                if (index === idx) return { ...rule, priority: sorted[swapIdx].priority };
                if (index === swapIdx) return { ...rule, priority: sorted[idx].priority };
                return rule;
            });

            const [firstRule, secondRule] = [updated[idx], updated[swapIdx]];
            const cardKey = window.localStorage?.getItem("spendgate.cardKey");
            const headers = getRuleRequestHeaders(cardKey, true);

            const [firstResponse, secondResponse] = await Promise.all([
                fetch(`/api/rules/${firstRule.id}`, {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ priority: firstRule.priority }),
                }),
                fetch(`/api/rules/${secondRule.id}`, {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ priority: secondRule.priority }),
                }),
            ]);

            if (!firstResponse.ok || !secondResponse.ok) {
                const message = !firstResponse.ok
                    ? await getResponseError(firstResponse, "Failed to reorder rule")
                    : await getResponseError(secondResponse, "Failed to reorder rule");

                setError(message);
                throw new Error(message);
            }

            setRules(updated.sort((a, b) => a.priority - b.priority));
        },
        [rules]
    );

    const deployRules = useCallback(
        async (cardKey: string) => {
            setDeploying(true);
            setDeployError(null);

            try {
                const res = await fetch("/api/deploy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cardKey, rules }),
                }).catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : "Unknown deploy error";
                    setDeployError(message);
                    throw error;
                });

                const data = (await res.json()) as {
                    success?: boolean;
                    error?: string;
                    codeId?: string;
                };

                if (!res.ok || !data.success) {
                    const message = data.error ?? "Deploy failed";
                    setDeployError(message);
                    return Promise.reject(new Error(message));
                }

                setLastDeployCodeId(data.codeId ?? null);
                return data;
            } finally {
                setDeploying(false);
            }
        },
        [rules]
    );

    return {
        rules,
        compiledCode,
        loading,
        error,
        deploying,
        deployError,
        lastDeployCodeId,
        addRule,
        toggleRule,
        deleteRule,
        reorderRule,
        deployRules,
    };
}
