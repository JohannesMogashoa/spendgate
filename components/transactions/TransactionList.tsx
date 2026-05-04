"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InvestecTransaction } from "@/lib/types";
import { SuggestionModal } from "@/components/SuggestionModal";
import type { RuleSuggestion } from "@/lib/rule-suggester";
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { getColumns } from "@/components/transactions/columns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/DataTablePagination";
import { useRulesStore } from "@/context/providers/rules-store-provider";
import { useRouter } from "next/navigation";

export function TransactionList() {
    const [transactions, setTransactions] = useState<InvestecTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTx, setSelectedTx] = useState<InvestecTransaction | null>(null);
    const setSuggestion = useRulesStore((state) => state.setSuggestion);
    const router = useRouter();

    const handleTransactionCreateRule = useCallback((tx: InvestecTransaction) => {
        setSelectedTx(tx);
    }, []);

    const handleCloseSuggestionModal = useCallback(() => {
        setSelectedTx(null);
    }, []);

    const handleSuggestionSelected = useCallback(
        async (suggestion: RuleSuggestion) => {
            setSuggestion(suggestion);
            handleCloseSuggestionModal();
            router.push("/rules");
        },
        [handleCloseSuggestionModal, router, setSuggestion]
    );

    const handleSuggestionsLoaded = useCallback(() => {}, []);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/transactions");
            if (!res.ok) {
                setError("Failed to fetch transactions");
                return;
            }

            const data = (await res.json()) as { transactions?: InvestecTransaction[] };
            setTransactions(data.transactions ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    const columns = useMemo(
        () => getColumns(handleTransactionCreateRule),
        [handleTransactionCreateRule]
    );

    const table = useReactTable({
        data: transactions,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

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
                <Table className="w-full text-sm">
                    <TableHeader className="border-b border-slate-200 bg-slate-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            className="px-4 py-3 text-left font-medium text-slate-600"
                                            key={header.id}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext()
                                                  )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <DataTablePagination table={table} />

                {/* Suggestion Modal */}
                {selectedTx && (
                    <SuggestionModal
                        transaction={selectedTx}
                        onSuggestionsLoaded={handleSuggestionsLoaded}
                        onSelectSuggestion={handleSuggestionSelected}
                        onClose={handleCloseSuggestionModal}
                    />
                )}
            </div>
        </div>
    );
}
