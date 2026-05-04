"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ruleSummary } from "@/lib/simulator";
import { useRules } from "@/hooks/useRules";
import Link from "next/link";

export function RuleList() {
    const { rules, loading, toggleRule, deleteRule, reorderRule } = useRules();

    return (
        <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Rules {loading && <span className="text-slate-400 font-normal">(loading…)</span>}
            </h2>
            {rules.length > 0 ? (
                rules.map((rule, idx) => (
                    <div
                        key={rule.id}
                        className={`rounded-xl border p-4 shadow-sm transition-colors ${
                            rule.active
                                ? "border-slate-200 bg-white"
                                : "border-slate-200 bg-slate-50 opacity-60"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                        #{rule.priority}
                                    </span>
                                    <span className="font-medium text-slate-800 truncate">
                                        {rule.label}
                                    </span>
                                    {rule.stopProcessing && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                                            stop after
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-slate-500">{ruleSummary(rule)}</p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {/* Toggle */}
                                <label className="relative inline-flex cursor-pointer items-center">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={rule.active}
                                        onChange={(e) => toggleRule(rule.id, e.target.checked)}
                                    />
                                    <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-blue-600 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                                </label>

                                {/* Reorder */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={idx === 0}
                                    onClick={() => reorderRule(rule.id, "up")}
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={idx === rules.length - 1}
                                    onClick={() => reorderRule(rule.id, "down")}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </Button>

                                {/* Delete */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                                    onClick={() => deleteRule(rule.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-400 text-sm">
                    No rules yet. Create your first from a transaction or a fresh one{" "}
                    <Link className={"underline"} href="/rules">
                        here
                    </Link>
                    .
                </div>
            )}
        </div>
    );
}
