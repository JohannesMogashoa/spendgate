import { NextRequest, NextResponse } from "next/server";

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const cardKey = req.headers.get("x-card-key");

        const rule = await prisma.spendRule.update({
            where: { id },
            data: {
                ...(body.label !== undefined && { label: body.label }),
                ...(body.active !== undefined && { active: body.active }),
                ...(body.priority !== undefined && { priority: body.priority }),
                ...(body.stopProcessing !== undefined && {
                    stopProcessing: body.stopProcessing,
                }),
                ...(body.conditions !== undefined && {
                    conditions: body.conditions,
                }),
                ...(body.actions !== undefined && { actions: body.actions }),
            },
        });

        // Trigger redeploy if card key provided
        if (cardKey?.trim()) {
            await triggerRedeploy(cardKey.trim());
        }

        return NextResponse.json(rule);
    } catch {
        return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cardKey = _req.headers.get("x-card-key");

        await prisma.spendRule.delete({ where: { id } });

        // Trigger redeploy if card key provided
        if (cardKey?.trim()) {
            await triggerRedeploy(cardKey.trim());
        }

        return new NextResponse(null, { status: 204 });
    } catch {
        return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
    }
}
