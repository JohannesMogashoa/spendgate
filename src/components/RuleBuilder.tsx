"use client";

import { FIELD_LABELS, OP_LABELS, RuleAction, RuleCondition, SpendRule } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useState } from "react";

const BLANK_CONDITION: RuleCondition = { field: "amount", op: "gt", value: 0 };
const BLANK_ACTION: RuleAction = { type: "block" };

const defaultDraft = (): Omit<SpendRule, "id"> => ({
    label: "",
    active: true,
    priority: 0,
    stopProcessing: false,
    conditions: [{ ...BLANK_CONDITION }],
    actions: [{ ...BLANK_ACTION }],
});

interface Props {
    onSave: (rule: Omit<SpendRule, "id">) => void;
    prefilled?: Omit<SpendRule, "id">;
}

export function RuleBuilder({ onSave, prefilled }: Props) {
    const [draft, setDraft] = useState<Omit<SpendRule, "id">>(prefilled ?? defaultDraft());

    function updateCondition(idx: number, patch: Partial<RuleCondition>) {
        setDraft((d) => ({
            ...d,
            conditions: d.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
        }));
    }

    function updateAction(idx: number, patch: Partial<RuleAction>) {
        setDraft((d) => ({
            ...d,
            actions: d.actions.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
        }));
    }

    function removeCondition(idx: number) {
        setDraft((d) => ({
            ...d,
            conditions: d.conditions.filter((_, i) => i !== idx),
        }));
    }

    function removeAction(idx: number) {
        setDraft((d) => ({
            ...d,
            actions: d.actions.filter((_, i) => i !== idx),
        }));
    }

    function handleSave() {
        if (!draft.label.trim()) return;
        onSave(draft);
        setDraft(defaultDraft());
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-slate-800">New Rule</h2>

            {/* Label + meta */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Label
                    </p>
                    <input
                        className="rounded-md border border-slate-300 w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Rule label (e.g. Block late-night spend)"
                        value={draft.label}
                        onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                    />
                </div>
                <div className="w-1/3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Priority
                    </p>
                    <input
                        type="number"
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Priority"
                        value={draft.priority}
                        onChange={(e) =>
                            setDraft((d) => ({
                                ...d,
                                priority: Number(e.target.value),
                            }))
                        }
                    />
                </div>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Conditions (AND)
                </p>
                {draft.conditions.map((cond, idx) => (
                    <ConditionRow
                        key={idx}
                        cond={cond}
                        onChange={(patch) => updateCondition(idx, patch)}
                        onRemove={() => removeCondition(idx)}
                    />
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() =>
                        setDraft((d) => ({
                            ...d,
                            conditions: [...d.conditions, { ...BLANK_CONDITION }],
                        }))
                    }
                >
                    <PlusCircle className="mr-1 h-4 w-4" /> Add condition
                </Button>
            </div>

            {/* Actions */}
            <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                </p>
                {draft.actions.map((action, idx) => (
                    <ActionRow
                        key={idx}
                        action={action}
                        onChange={(patch) => updateAction(idx, patch)}
                        onRemove={() => removeAction(idx)}
                    />
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() =>
                        setDraft((d) => ({
                            ...d,
                            actions: [...d.actions, { ...BLANK_ACTION }],
                        }))
                    }
                >
                    <PlusCircle className="mr-1 h-4 w-4" /> Add action
                </Button>
            </div>

            {/* Options */}
            <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                    type="checkbox"
                    checked={draft.stopProcessing}
                    onChange={(e) =>
                        setDraft((d) => ({
                            ...d,
                            stopProcessing: e.target.checked,
                        }))
                    }
                    className="rounded"
                />
                Stop processing further rules after this one
            </label>

            <Button
                onClick={handleSave}
                disabled={
                    !draft.label.trim() ||
                    draft.conditions.length === 0 ||
                    draft.actions.length === 0
                }
                className="w-full"
            >
                Save Rule
            </Button>
        </div>
    );
}

// ── ConditionRow ──────────────────────────────────────────────────────────────

function ConditionRow({
    cond,
    onChange,
    onRemove,
}: {
    cond: RuleCondition;
    onChange: (patch: Partial<RuleCondition>) => void;
    onRemove: () => void;
}) {
    const fieldOptions: RuleCondition["field"][] = ["amount", "merchant", "hour"];
    const opOptions: RuleCondition["op"][] =
        cond.field === "merchant" ? ["eq", "contains"] : ["gt", "lt", "gte", "lte", "eq"];

    return (
        <div className="flex items-center gap-2">
            <select
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cond.field}
                onChange={(e) =>
                    onChange({
                        field: e.target.value as RuleCondition["field"],
                        op: "gt",
                        value: 0,
                    })
                }
            >
                {fieldOptions.map((f) => (
                    <option key={f} value={f}>
                        {FIELD_LABELS[f]}
                    </option>
                ))}
            </select>

            <select
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cond.op}
                onChange={(e) => onChange({ op: e.target.value as RuleCondition["op"] })}
            >
                {opOptions.map((op) => (
                    <option key={op} value={op}>
                        {OP_LABELS[op]}
                    </option>
                ))}
            </select>

            <input
                className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                type={
                    cond.field === "merchant" ? "text" : cond.field === "hour" ? "time" : "number"
                }
                value={cond.value}
                placeholder={cond.field === "merchant" ? "e.g. woolworths" : "0"}
                onChange={(e) =>
                    onChange({
                        value:
                            cond.field === "merchant"
                                ? e.target.value
                                : cond.field === "hour"
                                  ? e.target.value
                                  : Number(e.target.value),
                    })
                }
            />

            <button onClick={onRemove} className="text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

// ── ActionRow ─────────────────────────────────────────────────────────────────

function ActionRow({
    action,
    onChange,
    onRemove,
}: {
    action: RuleAction;
    onChange: (patch: Partial<RuleAction>) => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <select
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={action.type}
                onChange={(e) =>
                    onChange({
                        type: e.target.value as RuleAction["type"],
                        channel: undefined,
                    })
                }
            >
                <option value="block">Block transaction</option>
                <option value="notify">Send notification</option>
            </select>

            {action.type === "notify" && (
                <select
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={action.channel ?? "push"}
                    onChange={(e) =>
                        onChange({
                            channel: e.target.value as RuleAction["channel"],
                        })
                    }
                >
                    <option value="push">Push</option>
                    <option value="whatsapp">WhatsApp</option>
                </select>
            )}

            <button onClick={onRemove} className="ml-auto text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}
