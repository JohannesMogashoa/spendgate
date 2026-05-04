import { NextRequest } from "next/server";
import { sendPushNotification } from "@/lib/push";
import { z } from "zod";

const WebhookSchema = z.object({
    token: z.string(),
    ruleId: z.string(),
    outcome: z.enum(["blocked", "notified", "allowed"]),
    authorization: z.object({
        centsAmount: z.number().optional(),
        merchant: z
            .object({
                name: z.string().optional(),
                category: z.object({ name: z.string().optional() }).optional(),
            })
            .optional(),
    }),
});

// No auth — this endpoint is called by card code running on Investec infrastructure
// Rate limit by IP in production if needed (Vercel middleware or Upstash)
export async function POST(req: NextRequest) {
    let body: z.infer<typeof WebhookSchema>;

    try {
        body = WebhookSchema.parse(await req.json());
    } catch {
        return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const { token, outcome, authorization } = body;
    const amount = ((authorization.centsAmount ?? 0) / 100).toFixed(2);
    const merchant = authorization.merchant?.name ?? "Unknown merchant";
    const icon = outcome === "blocked" ? "🚫" : "⚠️";

    await sendPushNotification(
        token,
        `${icon} SpendGate rule triggered`,
        `R${amount} at ${merchant} — ${outcome}`,
        { ruleId: body.ruleId, outcome }
    );

    // Must respond fast — card code has a ~2s execution window
    return Response.json({ ok: true });
}
