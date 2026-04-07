"use client";

import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { SimulationResult, SpendRule, Transaction } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { simulateTransaction } from "@/lib/simulator";
import { useState } from "react";

interface Props {
	rules: SpendRule[];
}

const DEFAULT_TX: Transaction = {
	centsAmount: 50000,
	merchant: { name: "Woolworths" },
	dateTime: new Date().toISOString(),
};

export function SimulationPanel({ rules }: Props) {
	const [tx, setTx] = useState<Transaction>(DEFAULT_TX);
	const [result, setResult] = useState<SimulationResult | null>(null);

	function run() {
		setResult(simulateTransaction(tx, rules));
	}

	const localHour = new Date(tx.dateTime).getHours();

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
			<div className="flex items-center gap-2">
				<Zap className="h-5 w-5 text-blue-500" />
				<h2 className="text-lg font-semibold text-slate-800">
					Simulate Transaction
				</h2>
			</div>

			{/* Inputs */}
			<div className="grid grid-cols-2 gap-3">
				<label className="space-y-1">
					<span className="text-xs font-medium text-slate-500">
						Amount (cents)
					</span>
					<input
						type="number"
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={tx.centsAmount}
						onChange={(e) =>
							setTx((t) => ({
								...t,
								centsAmount: Number(e.target.value),
							}))
						}
					/>
				</label>

				<label className="space-y-1">
					<span className="text-xs font-medium text-slate-500">
						Merchant name
					</span>
					<input
						type="text"
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={tx.merchant?.name ?? ""}
						onChange={(e) =>
							setTx((t) => ({
								...t,
								merchant: { name: e.target.value },
							}))
						}
					/>
				</label>

				<label className="col-span-2 space-y-1">
					<span className="text-xs font-medium text-slate-500">
						Date &amp; Time{" "}
						<span className="text-slate-400">
							(hour: {localHour}:00)
						</span>
					</span>
					<input
						type="datetime-local"
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						value={tx.dateTime.slice(0, 16)}
						onChange={(e) =>
							setTx((t) => ({
								...t,
								dateTime: new Date(
									e.target.value,
								).toISOString(),
							}))
						}
					/>
				</label>
			</div>

			<Button onClick={run} className="w-full">
				Run Simulation
			</Button>

			{/* Result */}
			{result && (
				<div
					className={`rounded-lg p-4 space-y-3 border ${
						result.decision === "blocked"
							? "border-red-200 bg-red-50"
							: "border-green-200 bg-green-50"
					}`}
				>
					<div className="flex items-center gap-2">
						{result.decision === "blocked" ? (
							<XCircle className="h-5 w-5 text-red-500" />
						) : (
							<CheckCircle2 className="h-5 w-5 text-green-600" />
						)}
						<span
							className={`font-semibold text-sm ${
								result.decision === "blocked"
									? "text-red-700"
									: "text-green-700"
							}`}
						>
							{result.decision === "blocked"
								? "BLOCKED"
								: "ALLOWED"}
						</span>
					</div>

					{result.triggeredRules.length > 0 && (
						<div>
							<p className="text-xs font-medium text-slate-600 mb-1">
								Triggered rules:
							</p>
							<ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
								{result.triggeredRules.map((r, i) => (
									<li key={i}>{r}</li>
								))}
							</ul>
						</div>
					)}

					{result.actions.length > 0 && (
						<div>
							<p className="text-xs font-medium text-slate-600 mb-1">
								Actions:
							</p>
							<ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
								{result.actions.map((a, i) => (
									<li key={i}>{a}</li>
								))}
							</ul>
						</div>
					)}

					{result.triggeredRules.length === 0 && (
						<p className="text-xs text-slate-500">
							No rules matched this transaction.
						</p>
					)}
				</div>
			)}
		</div>
	);
}
