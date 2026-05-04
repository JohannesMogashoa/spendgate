const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": [
        "Content-Type",
        "x-investec-client-id",
        "x-investec-client-secret",
        "x-investec-api-key",
        "x-investec-card-key",
    ].join(", "),
};

export function corsHeaders() {
    return CORS_HEADERS;
}

// Handle OPTIONS preflight for every route
export function handleOptions() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Wrap a JSON response with CORS headers
export function corsJson(data: unknown, status = 200) {
    return Response.json(data, { status, headers: CORS_HEADERS });
}
