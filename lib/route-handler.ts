import { NextRequest } from "next/server";
import { z } from "zod";
import { MissingCredentialsError } from "./credentials";
import { corsJson } from "./cors";

type Handler = (req: NextRequest) => Promise<Response>;

export function withErrorHandling(handler: Handler): Handler {
    return async (req) => {
        try {
            return await handler(req);
        } catch (e: unknown) {
            if (e instanceof MissingCredentialsError) {
                return corsJson({ error: e.message }, 400);
            }
            if (e instanceof z.ZodError) {
                return corsJson({ error: "Validation error", details: e.flatten() }, 400);
            }
            console.error("Unhandled error:", e);
            return corsJson({ error: "Internal server error" }, 500);
        }
    };
}
