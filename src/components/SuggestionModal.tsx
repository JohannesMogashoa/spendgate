"use client";

import { useCallback, useEffect, useState } from "react";
import type { RuleSuggestion } from "@/lib/rule-suggester";
import type { InvestecTransaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
    transaction: InvestecTransaction;
    onSuggestionsLoaded: (suggestions: RuleSuggestion[]) => void;
    onSelectSuggestion: (suggestion: RuleSuggestion) => void;
    onClose: () => void;
}

export function SuggestionModal({
    transaction,
    onSuggestionsLoaded,
    onSelectSuggestion,
    onClose,
}: Props) {
    const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch suggestions on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/suggest-rule", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(transaction),
                });

                if (!res.ok) throw new Error("Failed to fetch suggestions");
                const data = (await res.json()) as {
                    suggestions?: RuleSuggestion[];
                };
                setSuggestions(data.suggestions ?? []);
                onSuggestionsLoaded(data.suggestions ?? []);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        })();
    }, [transaction, onSuggestionsLoaded]);

    const handleSelect = useCallback(
        (suggestion: RuleSuggestion) => {
            onSelectSuggestion(suggestion);
            onClose();
        },
        [onSelectSuggestion, onClose]
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-900">Rule Suggestions</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Transaction:{" "}
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                            {" — "}
                            {transaction.description}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                    {loading && (
                        <div className="text-center text-slate-500 py-8">
                            Generating suggestions...
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {!loading && !error && suggestions.length === 0 && (
                        <div className="text-center text-slate-500 py-8">
                            No suggestions available for this transaction.
                        </div>
                    )}

                    {suggestions.map((sugg, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <h4 className="font-medium text-slate-900">{sugg.label}</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {sugg.description}
                                    </p>
                                    <div className="mt-3 space-y-1">
                                        {sugg.conditions.map((cond, i) => (
                                            <p key={i} className="text-xs text-slate-500">
                                                • {cond.field} {cond.op} {String(cond.value)}
                                            </p>
                                        ))}
                                        {sugg.actions.map((act, i) => (
                                            <p key={i} className="text-xs text-slate-500">
                                                → {act.type}
                                                {act.channel ? ` via ${act.channel}` : ""}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleSelect(sugg)}
                                    className="shrink-0"
                                    size="sm"
                                >
                                    Use this
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
