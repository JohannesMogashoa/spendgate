"use client";
import { ColumnDef } from "@tanstack/react-table";
import { InvestecTransaction } from "@/lib/types";

type CreateRuleHandler = (tx: InvestecTransaction) => void;

export const getColumns = (
    handleTransactionCreateRule: CreateRuleHandler
): ColumnDef<InvestecTransaction>[] => [
    {
        header: "Date",
        accessorKey: "transactionDate",
        cell: ({ getValue }) => {
            const date = new Date(getValue() as string);
            return date.toLocaleDateString("en-ZA", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        },
    },
    {
        header: "Merchant / Description",
        accessorKey: "description",
        cell: ({ getValue }) => <div className="truncate max-w-sm">{getValue() as string}</div>,
    },
    {
        header: "Amount",
        accessorKey: "amount",
        cell: ({ getValue, row }) => {
            const amount = Math.abs(getValue() as number);
            const isDebit = row.original.type === "DEBIT";
            return (
                <span className={`font-medium ${isDebit ? "text-red-600" : "text-green-600"}`}>
                    {isDebit ? "−" : "+"} R{amount.toFixed(2)}
                </span>
            );
        },
        meta: { align: "right" },
    },
    {
        header: "Type",
        accessorKey: "type",
        cell: ({ getValue }) => {
            const isDebit = getValue() === "DEBIT";
            return (
                <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        isDebit ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}
                >
                    {isDebit ? "Debit" : "Credit"}
                </span>
            );
        },
        meta: { align: "center" },
    },
    {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => {
            const tx = row.original;
            const isDebit = tx.type === "DEBIT";
            return (
                <div className="text-center">
                    {handleTransactionCreateRule && isDebit && (
                        <button
                            onClick={() => handleTransactionCreateRule(tx)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Create rule
                        </button>
                    )}
                </div>
            );
        },
    },
];
