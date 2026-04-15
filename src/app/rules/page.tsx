"use client";
import React, { useState } from "react";
import { CodePreview } from "@/components/CodePreview";
import { RuleBuilder } from "@/components/RuleBuilder";
import { useRules } from "@/hooks/useRules";
import type { RuleSuggestion } from "@/lib/rule-suggester";
import { RuleList } from "@/components/RuleList";
import { SimulationPanel } from "@/components/SimulationPanel";

const RulesPage = () => {
    const { rules, compiledCode, loading, error, addRule, toggleRule, deleteRule, reorderRule } =
        useRules();

    const [prefilledSuggestion, setPrefilledSuggestion] = useState<RuleSuggestion | null>(null);
    function handleSuggestionSelected(suggestion: RuleSuggestion) {
        setPrefilledSuggestion(suggestion);
        //setSelectedTx(null);
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {error && (
                <div className="mx-auto max-w-7xl px-6 pt-4">
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                </div>
            )}
            {/* Left: builder + rule list */}
            <div className="space-y-6">
                <RuleBuilder
                    onSave={addRule}
                    prefilled={
                        prefilledSuggestion
                            ? {
                                  label: prefilledSuggestion.label,
                                  active: true,
                                  priority: 0,
                                  stopProcessing: false,
                                  conditions: prefilledSuggestion.conditions,
                                  actions: prefilledSuggestion.actions,
                              }
                            : undefined
                    }
                />

                <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Rules{" "}
                        {loading && <span className="text-slate-400 font-normal">(loading…)</span>}
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
        </div>
    );
};

export default RulesPage;
