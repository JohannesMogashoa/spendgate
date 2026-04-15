import { NextRequest, NextResponse } from "next/server";

import { SpendRule } from "@/lib/types";
import { prisma } from "@/lib/prisma";

const DEPLOY_RETRY_MAX = 2;

async function triggerRedeploy(
    cardKey: string,
    attempt: number = 1
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch(
            new URL("/api/rules/deploy", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cardKey }),
            }
        );

        if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
                error?: string;
            };
            throw new Error(data.error ?? `Deploy failed: ${res.status}`);
        }

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Deploy attempt ${attempt}] ${message}`);

        if (attempt < DEPLOY_RETRY_MAX) {
            await new Promise((r) => setTimeout(r, 500 * attempt));
            return triggerRedeploy(cardKey, attempt + 1);
        }

        return { success: false, error: message };
    }
}

export async function GET() {
    try {
        const rules = await prisma.spendRule.findMany({
            orderBy: { priority: "asc" },
        });
        return NextResponse.json(rules);
    } catch {
        return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body: Omit<SpendRule, "id"> = await req.json();
        const cardKey = req.headers.get("x-card-key");

        if (!body.label || !Array.isArray(body.conditions) || !Array.isArray(body.actions)) {
            return NextResponse.json({ error: "Invalid rule payload" }, { status: 400 });
        }

        const rule = await prisma.spendRule.create({
            data: {
                label: body.label,
                active: body.active ?? true,
                priority: body.priority ?? 0,
                stopProcessing: body.stopProcessing ?? false,
                conditions: body.conditions,
                actions: body.actions,
            },
        });

        // Trigger redeploy if card key provided
        if (cardKey?.trim()) {
            await triggerRedeploy(cardKey.trim());
        }

        return NextResponse.json(rule, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
    }
}
