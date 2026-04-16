"use client";
import React, { useEffect } from "react";
import { CodePreview } from "@/components/CodePreview";
import { RuleBuilder } from "@/components/RuleBuilder";
import { useRules } from "@/hooks/useRules";
import { SimulationPanel } from "@/components/SimulationPanel";
import { useRulesStore } from "@/context/providers/rules-store-provider";

const RulesPage = () => {
    const { rules, compiledCode, error, addRule } = useRules();
    const { suggestion, clearSuggestion } = useRulesStore((s) => s);

    useEffect(() => {
        // Clear any existing suggestion when the page loads
        clearSuggestion();
    }, [clearSuggestion]);

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
                        suggestion
                            ? {
                                  label: suggestion.label,
                                  active: true,
                                  priority: 0,
                                  stopProcessing: false,
                                  conditions: suggestion.conditions,
                                  actions: suggestion.actions,
                              }
                            : undefined
                    }
                />
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
