import { NextRequest } from "next/server";

export type InvestecCredentials = {
    clientId: string;
    clientSecret: string;
    apiKey: string;
    cardKey?: string;
};

export function extractCredentials(request: NextRequest): InvestecCredentials {
    const clientId = request.headers.get("x-investec-client-id");
    const clientSecret = request.headers.get("x-investec-client-secret");
    const apiKey = request.headers.get("x-investec-api-key");
    const cardKey = request.headers.get("x-investec-card-key");

    if (!clientId || !clientSecret || !apiKey || !cardKey) {
        throw new MissingCredentialsError();
    }

    return { clientId, clientSecret, apiKey, cardKey };
}

export class MissingCredentialsError extends Error {
    constructor() {
        super("Missing required Investec credentials in request headers.");
        this.name = "MissingCredentialsError";
    }
}
