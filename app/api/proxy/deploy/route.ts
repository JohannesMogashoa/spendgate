import { NextRequest } from "next/server";
import { extractCredentials, MissingCredentialsError } from "@/lib/credentials";
import { investecFetch } from "@/lib/investec-client";
import { corsJson, handleOptions } from "@/lib/cors";
import z from "zod";

const deploySchema = z.object({
    compiledCode: z.string().min(10),
    sandbox: z.boolean().optional().default(false),
});

export function OPTIONS() {
    return handleOptions();
}

export async function POST(req: NextRequest) {
    try {
        const creds = extractCredentials(req);
        const body = deploySchema.parse(await req.json());
        const { compiledCode, sandbox } = body;

        if (!creds.cardKey) {
            return corsJson({ success: false, error: "cardKey is required" }, 400);
        }

        const simRes = await investecFetch(`/za/v1/cards/${creds.cardKey}/code/execute`, creds, {
            method: "POST",
            sandbox,
            body: {
                simulationcode: compiledCode,
                centsAmount: "10000", // R100 test transaction
                currencyCode: "ZAR",
                merchantCode: 5411,
                merchantName: "SpendGate Simulation",
                merchantCity: "Cape Town",
                countryCode: "ZA",
            },
        });

        if (!simRes.ok) {
            const err = await simRes.text();
            return corsJson({ success: false, error: `Simulation failed: ${err}` }, 400);
        }

        const saveRes = await investecFetch(`/za/v1/cards/${creds.cardKey}/code`, creds, {
            method: "POST",
            sandbox,
            body: { code: compiledCode },
        });

        if (!saveRes.ok) {
            return corsJson({ success: false, error: `Save failed: ${saveRes.status}` }, 500);
        }

        const { data } = await saveRes.json();
        const codeId: string = data.result.codeId;

        const pubRes = await investecFetch(`/za/v1/cards/${creds.cardKey}/publish`, creds, {
            method: "POST",
            sandbox,
            body: { codeid: codeId, code: "" },
        });

        if (!pubRes.ok) {
            return corsJson({ success: false, error: `Publish failed: ${pubRes.status}` }, 500);
        }

        return corsJson({ success: true, codeId });
    } catch (e: unknown) {
        if (e instanceof MissingCredentialsError) {
            return corsJson({ error: e.message }, 400);
        }
        if (e instanceof z.ZodError) {
            return corsJson({ error: "Invalid request body", details: z.treeifyError(e) }, 400);
        }
        return corsJson({ error: "Internal error", message: (e as Error).message }, 500);
    }
}
