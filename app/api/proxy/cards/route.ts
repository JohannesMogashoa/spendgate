import { corsJson } from "@/lib/cors";
import { extractCredentials } from "@/lib/credentials";
import { investecFetch } from "@/lib/investec-client";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const sandbox = req.nextUrl.searchParams.get("sandbox") === "true";
    const creds = extractCredentials(req);

    const res = await investecFetch("/za/v1/cards", creds, { sandbox });
    const data = await res.json();

    return corsJson(data, res.ok ? 200 : res.status);
}
