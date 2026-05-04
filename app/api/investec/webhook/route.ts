import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WebhookEvent } from "@/lib/types";

/**
 * Webhook handler — receives events from compiled card code when rules fire.
 * Logs transactions, updates rule stats, sends notifications.
 *
 * Called by card code via fetch() after rule evaluation.
 * Must return 200 quickly (card timeout ~2 seconds).
 */
export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as WebhookEvent;
        const { ruleId, outcome, authorization } = body;

        if (!ruleId || !outcome || !authorization) {
            // Silently ignore malformed requests so card doesn't stall
            return NextResponse.json({ ok: true });
        }

        // Find the rule; silently ignore if not found (rule may have been deleted)
        const rule = await prisma.spendRule.findUnique({
            where: { id: ruleId },
        });

        if (!rule) {
            return NextResponse.json({ ok: true });
        }

        // Log the transaction event
        await prisma.transactionEvent.create({
            data: {
                ruleId: rule.id,
                outcome,
                centsAmount: authorization.centsAmount ?? 0,
                merchantName: authorization.merchant?.name,
                currencyCode: authorization.currencyCode ?? "ZAR",
                occurredAt: new Date(),
            },
        });

        // Update rule stats: increment trigger count
        const updateData: {
            triggerCount?: { increment: number };
            savedAmount?: { increment: number };
        } = {
            triggerCount: { increment: 1 },
        };

        // If blocked, add to cumulative savings
        if (outcome === "blocked") {
            updateData.savedAmount = { increment: authorization.centsAmount ?? 0 };
        }

        await prisma.spendRule.update({
            where: { id: rule.id },
            data: updateData,
        });

        // Send email notification if configured (async, don't wait)
        // This keeps the webhook response fast for the card
        if (process.env.RESEND_API_KEY) {
            sendNotificationEmail(rule.id, outcome, authorization).catch((err) => {
                console.error(`[webhook] Failed to send notification for rule ${rule.id}:`, err);
            });
        }

        // Return 200 immediately so card doesn't stall
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[webhook] Unhandled error:", error);
        // Always return 200 so card code doesn't fail
        return NextResponse.json({ ok: true });
    }
}

/**
 * Send email notification asynchronously.
 * Called but not awaited by webhook handler to keep response fast.
 */
async function sendNotificationEmail(
    ruleId: string,
    outcome: string,
    authorization: { centsAmount?: number; merchant?: { name?: string } }
): Promise<void> {
    try {
        // Import Resend dynamically to avoid requiring it if not configured
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { Resend } = await import("resend");

        // Fetch rule and user for email details
        const rule = await prisma.spendRule.findUnique({
            where: { id: ruleId },
        });

        if (!rule) return;

        // For now, we don't have user email in the current schema.
        // In production (Phase 9), this would use user.email from a User relation.
        // For MVP, log only.
        const amount = ((authorization.centsAmount ?? 0) / 100).toFixed(2);
        const merchant = authorization.merchant?.name ?? "Unknown merchant";

        console.log(
            `[webhook] Would notify for rule "${rule.label}": ${merchant} R${amount} (${outcome})`
        );

        // Once user model is added in Phase 9, uncomment:
        // await resend.emails.send({
        //   from: 'SpendGate <noreply@spendgate.app>',
        //   to: user.email,
        //   subject: `SpendGate: Rule triggered — ${rule.label}`,
        //   html: `<p>Your rule "<strong>${rule.label}</strong>" was triggered.</p>
        //          <p>Transaction: R${amount} at ${merchant}</p>
        //          <p>Outcome: <strong>${outcome}</strong></p>`,
        // });
    } catch (error) {
        console.error("[webhook] sendNotificationEmail failed:", error);
        // Silently fail — don't let email errors crash the process
    }
}
