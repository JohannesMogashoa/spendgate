"use client";

import { CodePreview } from "@/components/CodePreview";
import { RuleBuilder } from "@/components/RuleBuilder";
import { RuleList } from "@/components/RuleList";
import { SimulationPanel } from "@/components/SimulationPanel";
import { useRules } from "@/hooks/useRules";

export default function Home() {
	const {
		rules,
		compiledCode,
		loading,
		error,
		addRule,
		toggleRule,
		deleteRule,
		reorderRule,
	} = useRules();

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Header */}
			<header className="border-b border-slate-200 bg-white shadow-sm">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
					<div>
						<h1 className="text-xl font-bold text-slate-900 tracking-tight">
							SpendGate
						</h1>
						<p className="text-xs text-slate-500">
							Investec Programmable Card Rule Engine
						</p>
					</div>
					<span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
						{rules.filter((r) => r.active).length} active rule
						{rules.filter((r) => r.active).length !== 1 ? "s" : ""}
					</span>
				</div>
			</header>

			{error && (
				<div className="mx-auto max-w-7xl px-6 pt-4">
					<div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
						{error}
					</div>
				</div>
			)}

			<main className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
				{/* Left: builder + rule list */}
				<div className="space-y-6">
					<RuleBuilder onSave={addRule} />

					<div className="space-y-3">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
							Rules{" "}
							{loading && (
								<span className="text-slate-400 font-normal">
									(loading…)
								</span>
							)}
						</h2>
						<RuleList
							rules={rules}
							onToggle={toggleRule}
							onDelete={deleteRule}
							onReorder={reorderRule}
						/>
					</div>
				</div>

				{/* Right: code preview + simulation */}
				<div className="space-y-6">
					<div className="space-y-2">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
							Compiled Output
						</h2>
						<CodePreview code={compiledCode} />
					</div>

					<SimulationPanel rules={rules} />
				</div>
			</main>
		</div>
	);
}
