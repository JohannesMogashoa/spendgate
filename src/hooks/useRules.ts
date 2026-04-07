"use client";

import { RuleAction, RuleCondition, SpendRule } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

import { compileRules } from "@/lib/compiler";

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

	// Recompile whenever rules change
	useEffect(() => {
		setCompiledCode(compileRules(rules));
	}, [rules]);

	const fetchRules = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/rules");
			if (!res.ok) throw new Error("Failed to fetch rules");
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
		const res = await fetch("/api/rules", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(draft),
		});
		if (!res.ok) throw new Error("Failed to save rule");
		const created = (await res.json()) as Record<string, unknown>;
		setRules((prev) =>
			[...prev, toSpendRule(created)].sort(
				(a, b) => a.priority - b.priority,
			),
		);
	}, []);

	const toggleRule = useCallback(async (id: string, active: boolean) => {
		setRules((prev) =>
			prev.map((r) => (r.id === id ? { ...r, active } : r)),
		);
		await fetch(`/api/rules/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ active }),
		});
	}, []);

	const deleteRule = useCallback(async (id: string) => {
		setRules((prev) => prev.filter((r) => r.id !== id));
		await fetch(`/api/rules/${id}`, { method: "DELETE" });
	}, []);

	const reorderRule = useCallback(
		async (id: string, direction: "up" | "down") => {
			setRules((prev) => {
				const sorted = [...prev].sort(
					(a, b) => a.priority - b.priority,
				);
				const idx = sorted.findIndex((r) => r.id === id);
				const swapIdx = direction === "up" ? idx - 1 : idx + 1;
				if (swapIdx < 0 || swapIdx >= sorted.length) return prev;

				const updated = sorted.map((r, i) => {
					if (i === idx)
						return { ...r, priority: sorted[swapIdx].priority };
					if (i === swapIdx)
						return { ...r, priority: sorted[idx].priority };
					return r;
				});

				// Persist both priority changes
				const a = updated[idx];
				const b = updated[swapIdx];
				fetch(`/api/rules/${a.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ priority: a.priority }),
				});
				fetch(`/api/rules/${b.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ priority: b.priority }),
				});

				return updated.sort((x, y) => x.priority - y.priority);
			});
		},
		[],
	);

	return {
		rules,
		compiledCode,
		loading,
		error,
		addRule,
		toggleRule,
		deleteRule,
		reorderRule,
	};
}
