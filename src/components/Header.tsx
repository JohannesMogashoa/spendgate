"use client";
import React from "react";
import { useRules } from "@/hooks/useRules";

const Header = () => {
    const { rules } = useRules();
    return (
        <header className="border-b border-slate-200 bg-white shadow-sm">
            <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">SpendGate</h1>
                    <p className="text-xs text-slate-500">Investec Programmable Card Rule Engine</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {rules.filter((r) => r.active).length} active rule
                    {rules.filter((r) => r.active).length !== 1 ? "s" : ""}
                </span>
            </div>
        </header>
    );
};

export default Header;
