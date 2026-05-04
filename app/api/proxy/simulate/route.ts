import { NextRequest } from "next/server";

import z from "zod";
import { extractCredentials } from "@/lib/credentials";
import { corsJson } from "@/lib/cors";
import { investecFetch } from "@/lib/investec-client";

const simulateSchema = z.object({
    compiledCode: z.string(),
    merchantName: z.string().default("Test"),
    centsAmount: z.number().int().positive(),
    merchantCode: z.number().int().default(5411),
    currencyCode: z.string().default("zar"),
    countryCode: z.string().default("ZA"),
    sandbox: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
    try {
        const creds = extractCredentials(req);
        const body = simulateSchema.parse(await req.json());

        if (!creds.cardKey) {
            return corsJson({ success: false, error: "cardKey is required" }, 400);
        }

        const res = await investecFetch(`/za/v1/cards/${creds.cardKey}/code/execute`, creds, {
            method: "POST",
            sandbox: body.sandbox,
            body: {
                simulationcode: body.compiledCode,
                centsAmount: String(body.centsAmount),
                currencyCode: body.currencyCode,
                merchantCode: body.merchantCode,
                merchantName: body.merchantName,
                merchantCity: "Cape Town",
                countryCode: body.countryCode,
            },
        });

        const result = await res.json();
        return corsJson({ allowed: result.data?.result ?? true, raw: result });
    } catch {
        return corsJson({ success: false, error: "Simulation failed" }, 500);
    }
}
