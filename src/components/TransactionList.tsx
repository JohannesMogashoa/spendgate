"use client";
import { useCallback, useEffect, useState } from "react";
import type { InvestecTransaction } from "@/lib/types";
import { SuggestionModal } from "@/components/SuggestionModal";
import type { RuleSuggestion } from "@/lib/rule-suggester";

export function TransactionList() {
    const [transactions, setTransactions] = useState<InvestecTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTx, setSelectedTx] = useState<InvestecTransaction | null>(null);
    const [prefilledSuggestion, setPrefilledSuggestion] = useState<RuleSuggestion | null>(null);

    function handleTransactionCreateRule(tx: InvestecTransaction) {
        setSelectedTx(tx);
    }

    function handleSuggestionSelected(suggestion: RuleSuggestion) {
        setPrefilledSuggestion(suggestion);
        setSelectedTx(null);
    }

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/transactions");
            if (!res.ok) throw new Error("Failed to fetch transactions");
            const data = (await res.json()) as { transactions?: InvestecTransaction[] };
            setTransactions(data.transactions ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
                Loading transactions...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
                <p className="font-medium">Error loading transactions</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    if (!transactions.length) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-400 text-sm">
                No transactions found for the last 90 days.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">
                                Merchant / Description
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-slate-600">
                                Amount
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-slate-600">
                                Type
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-slate-600">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {transactions.map((tx, idx) => {
                            const date = new Date(tx.transactionDate);
                            const dateStr = date.toLocaleDateString("en-ZA", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            });
                            const amount = Math.abs(tx.amount);
                            const isDebit = tx.type === "DEBIT";

                            return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-slate-700">{dateStr}</td>
                                    <td className="px-4 py-3 text-slate-700 truncate max-w-sm">
                                        {tx.description}
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right font-medium ${
                                            isDebit ? "text-red-600" : "text-green-600"
                                        }`}
                                    >
                                        {isDebit ? "−" : "+"} R{amount.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                                isDebit
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-green-100 text-green-700"
                                            }`}
                                        >
                                            {isDebit ? "Debit" : "Credit"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {handleTransactionCreateRule && isDebit && (
                                            <button
                                                onClick={() => handleTransactionCreateRule(tx)}
                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Create rule
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Suggestion Modal */}
                {selectedTx && (
                    <SuggestionModal
                        transaction={selectedTx}
                        onSuggestionsLoaded={() => {}}
                        onSelectSuggestion={handleSuggestionSelected}
                        onClose={() => setSelectedTx(null)}
                    />
                )}
            </div>
        </div>
    );
}
