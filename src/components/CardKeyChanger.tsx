"use client";
import React, { useState } from "react";
import { useRules } from "@/hooks/useRules";

const CardKeyChanger = () => {
    const { deploying, deployError, lastDeployCodeId, deployRules } = useRules();
    const [cardKey, setCardKey] = useState(() => {
        if (typeof window === "undefined") return "";
        return window.localStorage.getItem("spendgate.cardKey") ?? "";
    });

    function onCardKeyChange(value: string) {
        setCardKey(value);
        if (typeof window === "undefined") return "";
        window.localStorage.setItem("spendgate.cardKey", value);
    }

    async function onDeploy() {
        if (!cardKey.trim()) return;
        await deployRules(cardKey.trim());
    }

    return (
        <div>
            <div className="flex items-center gap-2">
                <input
                    value={cardKey}
                    onChange={(e) => onCardKeyChange(e.target.value)}
                    placeholder="Card key"
                    className="h-8 w-44 rounded-md border border-slate-300 px-2 text-xs"
                />
                <button
                    type="button"
                    disabled={deploying || !cardKey.trim()}
                    onClick={onDeploy}
                    className="h-8 rounded-md bg-slate-900 px-3 text-xs font-medium text-white disabled:opacity-50"
                >
                    {deploying ? "Deploying..." : "Deploy to card"}
                </button>
            </div>
            {(deployError || lastDeployCodeId) && (
                <div className="mx-auto max-w-7xl px-6 pb-3 text-xs">
                    {deployError ? (
                        <p className="text-red-600">Deploy failed: {deployError}</p>
                    ) : (
                        <p className="text-green-700">
                            Deploy successful. codeId: {lastDeployCodeId}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default CardKeyChanger;
