const BASE =
    process.env.USE_SANDBOX === "true"
        ? "https://openapisandbox.investec.com/za/v1"
        : "https://openapi.investec.com/za/v1";

async function readErrorText(res: Response): Promise<string> {
    try {
        const text = await res.text();
        return text || `${res.status} ${res.statusText}`;
    } catch {
        return `${res.status} ${res.statusText}`;
    }
}

async function getAccessToken(): Promise<string> {
    if (!process.env.INVESTEC_CLIENT_ID || !process.env.INVESTEC_CLIENT_SECRET) {
        throw new Error("Missing Investec OAuth credentials");
    }

    const res = await fetch("https://identity.investec.com/am/oauth2/za/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: process.env.INVESTEC_CLIENT_ID!,
            client_secret: process.env.INVESTEC_CLIENT_SECRET!,
            scope: "cards",
        }),
    });

    if (!res.ok) {
        throw new Error(`Token fetch failed: ${await readErrorText(res)}`);
    }

    const { access_token } = (await res.json()) as { access_token?: string };
    if (!access_token) {
        throw new Error("Token fetch failed: missing access token");
    }

    return access_token;
}

export async function deployRulesToCard(
    cardKey: string,
    compiledCode: string
): Promise<{ success: boolean; codeId?: string; error?: string }> {
    if (!process.env.INVESTEC_API_KEY) {
        return { success: false, error: "Missing INVESTEC_API_KEY" };
    }

    let token: string;
    try {
        token = await getAccessToken();
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch access token",
        };
    }

    const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-api-key": process.env.INVESTEC_API_KEY,
    };

    // Step 1: simulate first — fail fast before touching live card
    const simRes = await fetch(`${BASE}/cards/${cardKey}/code/execute`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            simulationcode: compiledCode,
            centsAmount: "10000", // R100 test transaction
            currencyCode: "zar",
            merchantCode: 5411, // grocery store
            merchantName: "Test Merchant",
            merchantCity: "Cape Town",
            countryCode: "ZA",
        }),
    });

    if (!simRes.ok) {
        return {
            success: false,
            error: `Simulation failed: ${await readErrorText(simRes)}`,
        };
    }

    // Step 2: save (not yet live)
    const saveRes = await fetch(`${BASE}/cards/${cardKey}/code`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code: compiledCode }),
    });

    if (!saveRes.ok) {
        return {
            success: false,
            error: `Save failed: ${await readErrorText(saveRes)}`,
        };
    }

    const saveJson = (await saveRes.json()) as {
        data?: { result?: { codeId?: string } };
    };
    const codeId = saveJson.data?.result?.codeId;
    if (!codeId) {
        return {
            success: false,
            error: "Save failed: missing codeId in response",
        };
    }

    // Step 3: publish (now live)
    const publishRes = await fetch(`${BASE}/cards/${cardKey}/publish`, {
        method: "POST",
        headers,
        body: JSON.stringify({ codeid: codeId, code: "" }),
    });

    if (!publishRes.ok) {
        return {
            success: false,
            error: `Publish failed: ${await readErrorText(publishRes)}`,
        };
    }

    return { success: true, codeId };
}
