/**
 * Investec Open API client for authentication and API calls.
 * Handles OAuth2 token management and request wrapping.
 *
 * References:
 * - OAuth2: POST https://identity.investec.com/am/oauth2/za/token
 * - Card API: GET /za/v1/cards
 * - Transaction API: GET /za/pb/v1/accounts/:accountId/transactions
 */

const BASE =
    process.env.USE_SANDBOX === "true"
        ? "https://openapisandbox.investec.com"
        : "https://openapi.investec.com";

const clientId =
    process.env.USE_SANDBOX === "true"
        ? process.env.INVESTEC_SANDBOX_CLIENT_ID
        : process.env.INVESTEC_CLIENT_ID;

const clientSecret =
    process.env.USE_SANDBOX === "true"
        ? process.env.INVESTEC_SANDBOX_CLIENT_SECRET
        : process.env.INVESTEC_CLIENT_SECRET;

const apiKey =
    process.env.USE_SANDBOX === "true"
        ? process.env.INVESTEC_SANDBOX_API_KEY
        : process.env.INVESTEC_API_KEY;

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Get access token for Investec API calls.
 * Caches token and refreshes if expiring soon (5s buffer).
 */
export async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt - 5000) {
        return cachedToken.value;
    }

    if (!clientId || !clientSecret || !apiKey) {
        throw new Error("Missing Investec OAuth credentials");
    }

    const res = await fetch(`${BASE}/identity/v2/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "x-api-key": apiKey,
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            scope: "accounts cards",
        }),
    });

    if (!res.ok) {
        throw new Error(`Token fetch failed: ${res.status} ${await res.text().catch(() => "")}`);
    }

    const data = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
    };
    const { access_token, expires_in } = data;

    if (!access_token || !expires_in) {
        throw new Error("Token response missing required fields");
    }

    cachedToken = {
        value: access_token,
        expiresAt: Date.now() + expires_in * 1000,
    };

    return access_token;
}

/**
 * Make authenticated request to Investec API.
 * Automatically includes bearer token and API key.
 */
export async function investecFetch(path: string, options: RequestInit = {}): Promise<Response> {
    if (!apiKey) {
        throw new Error("Missing INVESTEC_API_KEY");
    }

    const token = await getAccessToken();

    return fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            ...options.headers,
        },
    });
}
