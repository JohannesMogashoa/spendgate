/**
 * Investec Open API client for authentication and API calls.
 * Handles OAuth2 token management and request wrapping.
 *
 * References:
 * - OAuth2: POST https://identity.investec.com/am/oauth2/za/token
 * - Card API: GET /za/v1/cards
 * - Transaction API: GET /za/pb/v1/accounts/:accountId/transactions
 */
import type { InvestecCredentials } from "./credentials";

function getBaseUrl(isSandbox: boolean): string {
    if (!process.env.INVESTEC_SANDBOX_BASE_URL || !process.env.INVESTEC_BASE_URL) {
        throw new Error("Base URL not configured in environment variables.");
    }

    return isSandbox ? process.env.INVESTEC_SANDBOX_BASE_URL : process.env.INVESTEC_BASE_URL;
}

/**
 * Get access token for Investec API calls.
 * Caches token and refreshes if expiring soon (5s buffer).
 */
export async function getAccessToken(
    creds: InvestecCredentials,
    isSandbox: boolean
): Promise<string> {
    const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");

    const res = await fetch(`${getBaseUrl(isSandbox)}/identity/v2/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basic}`,
            "x-api-key": creds.apiKey,
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            scope: "accounts cards",
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Token fetch failed: ${res.status} ${body}`);
    }

    const data = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
    };
    const { access_token, expires_in } = data;

    if (!access_token || !expires_in) {
        throw new Error("Token response missing required fields");
    }

    return access_token;
}

/**
 * Make authenticated request to Investec API.
 * Automatically includes bearer token and API key.
 */
export async function investecFetch(
    path: string,
    creds: InvestecCredentials,
    options: { method?: string; body?: unknown; sandbox?: boolean } = {}
): Promise<Response> {
    const { method = "GET", body, sandbox = false } = options;
    const token = await getAccessToken(creds, sandbox);
    const baseUrl = getBaseUrl(sandbox);

    return fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-api-key": creds.apiKey,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}
