# SpendGate — Agent Development Plan

> This document is the authoritative task breakdown for building SpendGate. It
> is structured for autonomous agent execution. Each feature phase is
> self-contained with acceptance criteria, relevant code patterns, file
> locations, and external references. Work top-to-bottom unless a phase is
> marked as parallelisable.

---

## Project Overview

SpendGate is a programmable spending rules builder for Investec cardholders.
Users define plain-English rules ("block fast food after 10pm", "warn me above
R500 on clothing") through a no-code UI. SpendGate compiles these into
JavaScript and deploys them to the Investec Programmable Card via the official
Card API. It also surfaces transaction history so users can right-click any
transaction and auto-generate a rule from it.

**Stack:** Next.js 14+ (App Router), TypeScript, Prisma, PostgreSQL, Tailwind
CSS, Resend (email), Investec Open API.

**Bounty context:** Q2 2026 Investec API Side Hustle —
[https://investec.gitbook.io/programmable-banking-community-wiki/get-building/build-events/q2-2026-bounty-challenge-or-api-side-hustle](https://investec.gitbook.io/programmable-banking-community-wiki/get-building/build-events/q2-2026-bounty-challenge-or-api-side-hustle)

---

## Repository Structure (target)

```
spendgate/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                  # Rule list + stats
│   │   ├── rules/
│   │   │   ├── new/page.tsx          # Rule builder
│   │   │   └── [id]/page.tsx         # Edit rule
│   │   └── transactions/
│   │       └── page.tsx              # Transaction list with right-click
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── rules/
│       │   ├── route.ts              # GET list, POST create
│       │   ├── [id]/route.ts         # PUT update, DELETE
│       │   └── deploy/route.ts       # POST trigger deploy
│       ├── transactions/
│       │   └── route.ts              # GET from Investec API
│       ├── suggest-rule/
│       │   └── route.ts              # POST generate rule from transaction
│       └── investec/
│           └── webhook/route.ts      # POST after/before transaction hooks
├── lib/
│   ├── compiler.ts                   # Rule DSL → JS string
│   ├── deployer.ts                   # Investec Card API calls
│   ├── investec-client.ts            # Auth + API wrapper
│   ├── rule-suggester.ts             # Transaction → rule suggestion
│   └── types.ts                      # Shared TypeScript types
├── prisma/
│   └── schema.prisma
├── components/
│   ├── rule-builder/
│   │   ├── SentenceBuilder.tsx
│   │   ├── ConditionRow.tsx
│   │   └── ActionPicker.tsx
│   └── transactions/
│       ├── TransactionList.tsx
│       └── ContextMenu.tsx
├── knowledge/                        # Bounty requirement
│   └── gotchas.md
├── .env.example
└── README.md
```

---

## Environment Variables

Create `.env.local` from `.env.example`. The following are required:

```env
# Investec API
INVESTEC_CLIENT_ID=
INVESTEC_CLIENT_SECRET=
INVESTEC_API_KEY=
INVESTEC_BASE_URL=https://openapi.investec.com
INVESTEC_SANDBOX_BASE_URL=https://openapisandbox.investec.com

# Database (Supabase or local Postgres)
DATABASE_URL=postgresql://...

# Auth (NextAuth)
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Notifications
RESEND_API_KEY=

# Feature flags
USE_SANDBOX=true   # Set false only for production with real credentials
```

> **References:**
>
> - Sandbox credentials:
>   [https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide](https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide)
> - Investec OAuth2: `POST https://identity.investec.com/am/oauth2/za/token`

---

## Phase 0 — Project Bootstrap

**Goal:** Runnable Next.js app with DB, auth scaffold, and Investec client
connected to sandbox.

### Tasks

- [ ] `npx create-next-app@latest spendgate --typescript --tailwind --app`
- [ ] Install dependencies:
    ```bash
    npm install prisma @prisma/client next-auth @auth/prisma-adapter resend zod
    npm install -D @types/node
    npx prisma init
    ```
- [ ] Set up Prisma schema (see Phase 1)
- [ ] Scaffold `lib/investec-client.ts` with token fetch + refresh
- [ ] Verify sandbox connection: `GET /za/v1/cards` returns card list
- [ ] Set up `.env.example` with all required keys

### Investec Client Scaffold

```typescript
// lib/investec-client.ts
const BASE =
    process.env.USE_SANDBOX === "true"
        ? "https://openapisandbox.investec.com"
        : "https://openapi.investec.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt - 5000) {
        return cachedToken.value;
    }
    const res = await fetch(
        "https://identity.investec.com/am/oauth2/za/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(
                    `${process.env.INVESTEC_CLIENT_ID}:${process.env.INVESTEC_CLIENT_SECRET}`
                ).toString("base64")}`,
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                scope: "accounts cards",
            }),
        }
    );
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
    const { access_token, expires_in } = await res.json();
    cachedToken = {
        value: access_token,
        expiresAt: Date.now() + expires_in * 1000,
    };
    return access_token;
}

export async function investecFetch(path: string, options: RequestInit = {}) {
    const token = await getAccessToken();
    return fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-api-key": process.env.INVESTEC_API_KEY!,
            ...options.headers,
        },
    });
}
```

**Acceptance criteria:**

- `npm run dev` starts without errors
- `investecFetch('/za/v1/cards')` returns a valid card list from sandbox
- Prisma can connect to database and run migrations

---

## Phase 1 — Database Schema

**Goal:** Complete Prisma schema covering users, rules, events, and cards.

### Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String?
  investecCardKey   String?  // from GET /za/v1/cards — CardKey field
  investecClientId  String?  // encrypted at rest
  investecSecret    String?  // encrypted at rest
  rules             Rule[]
  events            TransactionEvent[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Rule {
  id           String      @id @default(cuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  label        String      // "Block fast food after 10pm"
  active       Boolean     @default(true)
  priority     Int         @default(0)   // lower = evaluated first
  conditions   Json        // RuleCondition[]
  action       String      // "block" | "notify" | "require_pin"
  notifyChannel String     @default("none") // "push" | "email" | "none"
  triggerCount Int         @default(0)
  savedAmount  Int         @default(0)  // cumulative saved in cents
  lastDeployedAt DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model TransactionEvent {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  ruleId          String?  // which rule triggered (if any)
  outcome         String   // "allowed" | "blocked" | "notified"
  centsAmount     Int
  merchantName    String?
  merchantCategory String?
  merchantCity    String?
  currencyCode    String   @default("ZAR")
  occurredAt      DateTime @default(now())
}

model DeploymentLog {
  id         String   @id @default(cuid())
  userId     String
  codeId     String   // returned by Investec /code endpoint
  ruleCount  Int
  success    Boolean
  error      String?
  deployedAt DateTime @default(now())
}
```

Run migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Acceptance criteria:**

- `npx prisma studio` shows all four tables
- Relations resolve correctly

---

## Phase 2 — Rule Type System & Compiler

**Goal:** A complete, tested `compileRules()` function that turns an array of
`SpendRule` objects into a single valid Investec card JS string.

> **Key constraint:** The Investec card runs one JS file. All rules must be
> merged into a single `beforeTransaction` export. The function must complete
> within ~2 seconds.

### Types

```typescript
// lib/types.ts

export type ConditionField =
    | "amount"
    | "merchant_name"
    | "merchant_category"
    | "hour_of_day"
    | "day_of_week"
    | "month_total";

export type ConditionOperator =
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "eq"
    | "contains"
    | "not_contains";

export type RuleCondition = {
    field: ConditionField;
    op: ConditionOperator;
    value: string | number;
};

export type RuleAction = "block" | "notify" | "allow";

export type SpendRule = {
    id: string;
    label: string;
    active: boolean;
    priority: number;
    conditions: RuleCondition[]; // AND logic across all conditions
    action: RuleAction;
    notifyChannel: "push" | "email" | "none";
    webhookUrl?: string; // SpendGate API webhook for notify actions
};
```

### Compiler

```typescript
// lib/compiler.ts
import type { SpendRule, RuleCondition } from "./types";

function fieldAccessor(field: SpendRule["conditions"][0]["field"]): string {
    const map: Record<string, string> = {
        amount: "(authorization.centsAmount / 100)",
        merchant_name: '(authorization.merchant?.name ?? "")',
        merchant_category: '(authorization.merchant?.category?.name ?? "")',
        hour_of_day: "(new Date().getHours())",
        day_of_week: "(new Date().getDay())", // 0=Sun, 6=Sat
        month_total: "(ctx?.monthSpend ?? 0) / 100",
    };
    return map[field];
}

function compileCondition(c: RuleCondition): string {
    const accessor = fieldAccessor(c.field);
    const val =
        typeof c.value === "string"
            ? `"${c.value.replace(/"/g, '\\"')}"`
            : c.value;

    switch (c.op) {
        case "gt":
            return `${accessor} > ${val}`;
        case "lt":
            return `${accessor} < ${val}`;
        case "gte":
            return `${accessor} >= ${val}`;
        case "lte":
            return `${accessor} <= ${val}`;
        case "eq":
            return `${accessor} === ${val}`;
        case "contains":
            return `${accessor}.toLowerCase().includes(${val}.toLowerCase())`;
        case "not_contains":
            return `!${accessor}.toLowerCase().includes(${val}.toLowerCase())`;
        default:
            return "false";
    }
}

export function compileRules(rules: SpendRule[], webhookBase: string): string {
    const active = rules
        .filter((r) => r.active)
        .sort((a, b) => a.priority - b.priority);

    if (active.length === 0) {
        return `const beforeTransaction = async (authorization) => { return true; };`;
    }

    const ruleBlocks = active
        .map((rule) => {
            const conditions = rule.conditions
                .map(compileCondition)
                .join(" && ");
            const ruleId = rule.id.replace(/[^a-z0-9]/gi, "_");

            let actionBlock: string;

            if (rule.action === "block") {
                actionBlock = `
      // Rule: ${rule.label}
      if (${conditions}) {
        await fetch("${webhookBase}/api/investec/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId: "${ruleId}", outcome: "blocked", authorization })
        }).catch(() => {});
        return false;
      }`;
            } else if (rule.action === "notify") {
                actionBlock = `
      // Rule: ${rule.label}
      if (${conditions}) {
        await fetch("${webhookBase}/api/investec/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId: "${ruleId}", outcome: "notified", authorization })
        }).catch(() => {});
      }`;
            } else {
                actionBlock = `
      // Rule: ${rule.label} (allow - audit only)
      if (${conditions}) {
        await fetch("${webhookBase}/api/investec/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId: "${ruleId}", outcome: "allowed", authorization })
        }).catch(() => {});
      }`;
            }

            return actionBlock;
        })
        .join("\n");

    return `
// Auto-generated by SpendGate — do not edit manually
// Rules: ${active.length} active | Generated: ${new Date().toISOString()}

const beforeTransaction = async (authorization) => {
${ruleBlocks}
  return true;
};

const afterTransaction = async (transaction) => {
  // No-op: afterTransaction logging handled via webhook
};
`.trim();
}
```

**Acceptance criteria:**

- `compileRules([])` returns a valid pass-through function
- A block rule with `amount > 500` produces
  `(authorization.centsAmount / 100) > 500`
- A contains rule on merchant_name is case-insensitive
- Multiple rules produce one merged function, evaluated in priority order
- Output is valid JavaScript (test by parsing with `new Function(code)`)

### Unit test scaffold

```typescript
// lib/__tests__/compiler.test.ts
import { compileRules } from "../compiler";

test("empty rules produces pass-through", () => {
    const code = compileRules([], "https://example.com");
    expect(code).toContain("return true");
    expect(() => new Function(code)).not.toThrow();
});

test("block rule on amount", () => {
    const code = compileRules(
        [
            {
                id: "rule-1",
                label: "Block >R500",
                active: true,
                priority: 0,
                conditions: [{ field: "amount", op: "gt", value: 500 }],
                action: "block",
                notifyChannel: "none",
            },
        ],
        "https://example.com"
    );
    expect(code).toContain("> 500");
    expect(code).toContain("return false");
});
```

---

## Phase 3 — Card Deployer

**Goal:** A reliable `deployRulesToCard()` function that simulates, saves, and
publishes compiled code to a user's Investec card.

> **References:**
>
> - Card API docs:
>   [https://investec.gitbook.io/programmable-banking-community-wiki/get-started/card-quick-start-guide/how-to-use-the-cards-api](https://investec.gitbook.io/programmable-banking-community-wiki/get-started/card-quick-start-guide/how-to-use-the-cards-api)
> - `POST /za/v1/cards/:cardkey/code` — save (not live)
> - `POST /za/v1/cards/:cardkey/publish` — publish (goes live)
> - `POST /za/v1/cards/:cardkey/code/execute` — simulate (test before deploy)

### Deployer

```typescript
// lib/deployer.ts
import { investecFetch } from "./investec-client";
import { prisma } from "./prisma";

const TEST_TRANSACTION = {
    simulationcode: "", // filled in per-call
    centsAmount: "10000", // R100 test
    currencyCode: "zar",
    merchantCode: 5411, // grocery
    merchantName: "SpendGate Test Merchant",
    merchantCity: "Cape Town",
    countryCode: "ZA",
};

export type DeployResult = {
    success: boolean;
    codeId?: string;
    simulationPassed?: boolean;
    error?: string;
};

export async function deployRulesToCard(
    userId: string,
    cardKey: string,
    compiledCode: string
): Promise<DeployResult> {
    // Step 1: Simulate — fail safe before touching live card
    const simRes = await investecFetch(`/za/v1/cards/${cardKey}/code/execute`, {
        method: "POST",
        body: JSON.stringify({
            ...TEST_TRANSACTION,
            simulationcode: compiledCode,
        }),
    });

    if (!simRes.ok) {
        const err = await simRes.text();
        await prisma.deploymentLog.create({
            data: {
                userId,
                codeId: "",
                ruleCount: 0,
                success: false,
                error: `Simulation failed: ${err}`,
            },
        });
        return {
            success: false,
            simulationPassed: false,
            error: `Simulation failed: ${err}`,
        };
    }

    // Step 2: Save (not yet live)
    const saveRes = await investecFetch(`/za/v1/cards/${cardKey}/code`, {
        method: "POST",
        body: JSON.stringify({ code: compiledCode }),
    });

    if (!saveRes.ok) {
        return { success: false, error: `Save failed: ${saveRes.status}` };
    }

    const { data } = await saveRes.json();
    const codeId: string = data.result.codeId;

    // Step 3: Publish (now live)
    const pubRes = await investecFetch(`/za/v1/cards/${cardKey}/publish`, {
        method: "POST",
        body: JSON.stringify({ codeid: codeId, code: "" }),
    });

    const success = pubRes.ok;
    const ruleCount = (compiledCode.match(/\/\/ Rule:/g) ?? []).length;

    await prisma.deploymentLog.create({
        data: {
            userId,
            codeId,
            ruleCount,
            success,
            error: success ? null : `Publish failed: ${pubRes.status}`,
        },
    });

    return success
        ? { success: true, codeId, simulationPassed: true }
        : { success: false, error: `Publish failed: ${pubRes.status}` };
}
```

### Deploy API Route

```typescript
// app/api/rules/deploy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { compileRules } from "@/lib/compiler";
import { deployRulesToCard } from "@/lib/deployer";

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { rules: true },
    });

    if (!user?.investecCardKey) {
        return NextResponse.json(
            { error: "No card key configured" },
            { status: 400 }
        );
    }

    const compiledCode = compileRules(
        user.rules.map((r) => ({ ...r, conditions: r.conditions as any })),
        process.env.NEXTAUTH_URL!
    );

    const result = await deployRulesToCard(
        user.id,
        user.investecCardKey,
        compiledCode
    );

    if (result.success) {
        await prisma.rule.updateMany({
            where: { userId: user.id },
            data: { lastDeployedAt: new Date() },
        });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
```

**Acceptance criteria:**

- Simulation is always run before publish; deploy aborts if simulation fails
- `DeploymentLog` record written for every attempt, success or failure
- `Rule.lastDeployedAt` is updated after successful deploy
- Returns `{ success, codeId }` on success; `{ success: false, error }` on
  failure

---

## Phase 4 — Rule CRUD API

**Goal:** Full REST API for creating, reading, updating, and deleting rules.
Every mutation triggers a redeploy.

### Routes

```typescript
// app/api/rules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RuleConditionSchema = z.object({
    field: z.enum([
        "amount",
        "merchant_name",
        "merchant_category",
        "hour_of_day",
        "day_of_week",
        "month_total",
    ]),
    op: z.enum(["gt", "lt", "gte", "lte", "eq", "contains", "not_contains"]),
    value: z.union([z.string(), z.number()]),
});

const CreateRuleSchema = z.object({
    label: z.string().min(1).max(120),
    conditions: z.array(RuleConditionSchema).min(1).max(5),
    action: z.enum(["block", "notify", "allow"]),
    notifyChannel: z.enum(["push", "email", "none"]).default("none"),
    priority: z.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });
    if (!user)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rules = await prisma.rule.findMany({
        where: { userId: user.id },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateRuleSchema.safeParse(body);
    if (!parsed.success)
        return NextResponse.json(
            { error: parsed.error.flatten() },
            { status: 400 }
        );

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });
    if (!user)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rule = await prisma.rule.create({
        data: { userId: user.id, ...parsed.data },
    });

    // Trigger redeploy after any rule change
    await fetch(`${process.env.NEXTAUTH_URL}/api/rules/deploy`, {
        method: "POST",
        headers: { Cookie: req.headers.get("cookie") ?? "" },
    });

    return NextResponse.json(rule, { status: 201 });
}
```

> Note: Create a similar `app/api/rules/[id]/route.ts` for `PUT` (update) and
> `DELETE`. Both must also trigger a redeploy.

**Acceptance criteria:**

- `POST /api/rules` validates input via Zod, returns 400 on bad data
- `DELETE /api/rules/:id` removes the rule and redeploys remaining rules
- `PUT /api/rules/:id` with `{ active: false }` disables a rule and redeploys

---

## Phase 5 — Webhook Handler (Transaction Events)

**Goal:** Receive the `afterTransaction` / `blocked` webhook fired by the
compiled card code, log it, update rule stats, and send notifications.

> The compiled card code fires a `fetch()` to `POST /api/investec/webhook` on
> every triggered rule. This is the nerve centre for all logging and
> notifications.

```typescript
// app/api/investec/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { ruleId, outcome, authorization } = body;

    // Find the rule and its owner
    const rule = await prisma.rule.findUnique({
        where: { id: ruleId },
        include: { user: true },
    });

    if (!rule) return NextResponse.json({ ok: true }); // silently ignore unknown rules

    // Log the event
    await prisma.transactionEvent.create({
        data: {
            userId: rule.userId,
            ruleId: rule.id,
            outcome,
            centsAmount: authorization.centsAmount ?? 0,
            merchantName: authorization.merchant?.name,
            merchantCategory: authorization.merchant?.category?.name,
            merchantCity: authorization.merchant?.city,
            currencyCode: authorization.currencyCode ?? "ZAR",
        },
    });

    // Update rule stats
    await prisma.rule.update({
        where: { id: rule.id },
        data: {
            triggerCount: { increment: 1 },
            savedAmount:
                outcome === "blocked"
                    ? { increment: authorization.centsAmount ?? 0 }
                    : undefined,
        },
    });

    // Send notification if configured
    if (rule.notifyChannel === "email" && rule.user.email) {
        const amount = ((authorization.centsAmount ?? 0) / 100).toFixed(2);
        const merchant = authorization.merchant?.name ?? "Unknown merchant";

        await resend.emails.send({
            from: "SpendGate <noreply@spendgate.app>",
            to: rule.user.email,
            subject: `SpendGate: Rule triggered — ${rule.label}`,
            html: `<p>Your rule "<strong>${rule.label}</strong>" was triggered.</p>
             <p>Transaction: R${amount} at ${merchant}</p>
             <p>Outcome: <strong>${outcome}</strong></p>`,
        });
    }

    return NextResponse.json({ ok: true });
}
```

**Acceptance criteria:**

- Every webhook call produces a `TransactionEvent` record
- `rule.triggerCount` increments correctly
- `rule.savedAmount` increments in cents on `outcome === "blocked"` events
- Email notification is sent when `notifyChannel === "email"`
- Route returns `200` even for unknown rule IDs (card code must not stall)

---

## Phase 6 — Transactions API (Investec Feed)

**Goal:** Fetch the user's real transaction history from Investec and surface it
in the UI with a right-click-to-rule interaction.

> **Reference:** `GET /za/pb/v1/accounts/:accountId/transactions` Docs:
> [https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide/how-to-get-your-transaction-history](https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide/how-to-get-your-transaction-history)

### API Route

```typescript
// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { investecFetch } from "@/lib/investec-client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.user?.email)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });
    if (!user)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get accounts first
    const accountsRes = await investecFetch("/za/pb/v1/accounts");
    const {
        data: { accounts },
    } = await accountsRes.json();
    const accountId = accounts[0]?.accountId;
    if (!accountId) return NextResponse.json({ transactions: [] });

    // Fetch last 90 days
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const to = new Date().toISOString().split("T")[0];

    const txRes = await investecFetch(
        `/za/pb/v1/accounts/${accountId}/transactions?fromDate=${from}&toDate=${to}`
    );
    const {
        data: { transactions },
    } = await txRes.json();

    return NextResponse.json({ transactions });
}
```

### Transaction type

```typescript
// lib/types.ts (extend existing)
export type InvestecTransaction = {
    accountId: string;
    type: "DEBIT" | "CREDIT";
    transactionType: string;
    status: "POSTED" | "PENDING";
    description: string;
    cardNumber: string;
    postingDate: string;
    valueDate: string;
    transactionDate: string;
    amount: number;
    runningBalance: number;
};
```

**Acceptance criteria:**

- Returns last 90 days of transactions for the first account
- Returns empty array (not an error) when no accounts found
- Transactions are sorted by date descending before returning

---

## Phase 7 — Rule Suggestion from Transaction

**Goal:** When a user right-clicks a transaction and selects "Create rule from
this", generate 2–3 relevant rule suggestions they can pick from and save with
one click.

> This is one of the most user-delight features. The suggestion logic should be
> smart: infer sensible conditions from the transaction's merchant name,
> category, time, and amount. Do not use the LLM for this — pure deterministic
> logic keeps it fast, free, and explainable.

### Suggester Logic

```typescript
// lib/rule-suggester.ts
import type { InvestecTransaction, SpendRule, RuleCondition } from "./types";

type RuleSuggestion = Omit<
    SpendRule,
    "id" | "active" | "priority" | "notifyChannel"
> & {
    label: string;
    description: string; // shown in the UI picker
};

export function suggestRulesFromTransaction(
    tx: InvestecTransaction
): RuleSuggestion[] {
    const suggestions: RuleSuggestion[] = [];
    const merchantName = tx.description ?? "";
    const amount = Math.abs(tx.amount);
    const date = new Date(tx.transactionDate);
    const hour = date.getHours();
    const roundedAmount = Math.ceil(amount / 50) * 50; // round up to nearest R50

    // Suggestion 1: Block this exact merchant
    if (merchantName) {
        const shortName = merchantName.split(" ")[0]; // first word of merchant name
        suggestions.push({
            label: `Block ${shortName}`,
            description: `Decline any future charges from "${shortName}"`,
            conditions: [
                {
                    field: "merchant_name",
                    op: "contains",
                    value: shortName,
                },
            ],
            action: "block",
        });
    }

    // Suggestion 2: Warn on amount above this transaction's value
    suggestions.push({
        label: `Warn me above R${roundedAmount}`,
        description: `Notify when any single charge exceeds R${roundedAmount}`,
        conditions: [
            {
                field: "amount",
                op: "gt",
                value: roundedAmount,
            },
        ],
        action: "notify",
    });

    // Suggestion 3: Block this merchant after a certain hour (if transaction was late)
    if (hour >= 20 && merchantName) {
        const shortName = merchantName.split(" ")[0];
        suggestions.push({
            label: `Block ${shortName} after 8pm`,
            description: `Prevent late-night spending at "${shortName}"`,
            conditions: [
                { field: "merchant_name", op: "contains", value: shortName },
                { field: "hour_of_day", op: "gte", value: 20 },
            ],
            action: "block",
        });
    }

    // Suggestion 4: Monthly cap on merchant category (if debit and >R200)
    if (tx.type === "DEBIT" && amount > 200) {
        suggestions.push({
            label: `Cap monthly spend above R${roundedAmount * 3}`,
            description: `Block charges once you've spent R${roundedAmount * 3} in a single month`,
            conditions: [
                {
                    field: "month_total",
                    op: "gt",
                    value: roundedAmount * 3,
                },
            ],
            action: "block",
        });
    }

    return suggestions.slice(0, 3); // Return top 3
}
```

### API Route

```typescript
// app/api/suggest-rule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { suggestRulesFromTransaction } from "@/lib/rule-suggester";

export async function POST(req: NextRequest) {
    const transaction = await req.json();
    const suggestions = suggestRulesFromTransaction(transaction);
    return NextResponse.json({ suggestions });
}
```

**Acceptance criteria:**

- Always returns 2–3 suggestions for any valid transaction
- Merchant-name suggestions use the first word only (prevents over-specific
  rules)
- Time-based suggestion only generated for transactions at hour >= 20
- Returned suggestions are valid `SpendRule`-compatible objects (can be passed
  directly to `POST /api/rules`)

---

## Phase 8 — Dashboard UI

**Goal:** The main interface. A rule list with toggle, stats, a sentence-builder
for new rules, and a transaction list with right-click context menu.

### Component breakdown

**`components/rule-builder/SentenceBuilder.tsx`**

The core UX: a sentence-completion form. Never show raw field names. The user
completes:

> "When my [field selector] [operator selector] [value input], [action >
> selector]."

Key implementation notes:

- Field selector drives which operators are available (e.g. `merchant_name` only
  allows `contains`, `eq`, `not_contains`)
- Value input changes type based on field: number for `amount`, text for
  `merchant_name`, 0–23 slider for `hour_of_day`
- Live preview sentence updates as user changes any selector
- "Save rule" calls `POST /api/rules` then redirects to dashboard

**`components/transactions/TransactionList.tsx`**

- Fetches from `GET /api/transactions` on mount
- Renders a clean table: date, merchant, amount, type (DEBIT/CREDIT)
- On right-click (or long-press mobile), opens `ContextMenu` component
- On touch/mobile, a "..." button per row achieves the same

**`components/transactions/ContextMenu.tsx`**

```typescript
// Pseudocode structure
<ContextMenu transaction={tx}>
  <MenuItem onClick={() => handleSuggestRule(tx)}>
    Create rule from this transaction
  </MenuItem>
  <MenuItem onClick={() => handleCopyDetails(tx)}>
    Copy transaction details
  </MenuItem>
</ContextMenu>
```

When "Create rule from this transaction" is clicked:

1. Call `POST /api/suggest-rule` with the transaction
2. Open a modal showing 2–3 suggestion cards
3. User clicks a suggestion → pre-fills the `SentenceBuilder` with those values
4. User can tweak and save

**`app/dashboard/page.tsx`** — should display:

- 3–4 stat cards: total rules active, transactions blocked this month, total
  amount saved (R), last deployed
- Active rules list with toggle and delete
- "Add rule" button → navigate to `/dashboard/rules/new`
- "Transactions" tab link → `/dashboard/transactions`

### Stat card component pattern

```typescript
// components/StatCard.tsx
type Props = { label: string; value: string; sub?: string };

export function StatCard({ label, value, sub }: Props) {
  return (
    <div className="rounded-lg bg-muted p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-medium">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
```

**Acceptance criteria:**

- Dashboard loads with real data (rule count, saved amount from DB)
- Rules can be toggled on/off; toggle triggers a redeploy
- Right-click on any transaction opens context menu
- Selecting "Create rule" opens suggestion modal with 2–3 options
- Selecting a suggestion pre-fills the builder; saving it creates the rule and
  deploys

---

## Phase 9 — Auth (NextAuth)

**Goal:** Email magic-link auth (no passwords). Users log in once; Investec
credentials are stored per user.

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        EmailProvider({
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: Number(process.env.EMAIL_SERVER_PORT),
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            },
            from: process.env.EMAIL_FROM,
        }),
    ],
    pages: { signIn: "/login" },
    callbacks: {
        session: async ({ session, user }) => {
            session.user.id = user.id;
            return session;
        },
    },
});

export { handler as GET, handler as POST };
```

> For the bounty MVP, magic-link email auth is sufficient. A production version
> would use OAuth2 with Investec's own identity provider if/when they expose it
> publicly.

**Acceptance criteria:**

- User can log in via magic link email
- `session.user.id` is available in all API routes
- Unauthenticated requests to all `/api/*` routes (except webhook) return 401

---

## Phase 10 — Investec Credential Setup (Onboarding)

**Goal:** First-time user flow to collect and store Investec API credentials,
and detect their card key.

### Onboarding flow

1. After first login, redirect to `/onboarding` if `user.investecCardKey` is
   null
2. Prompt user to enter their `clientId`, `clientSecret`, and `apiKey` from
   Investec Developer Portal
3. On submit: test credentials by calling `GET /za/v1/cards` and verify a card
   is returned
4. If valid: store credentials (encrypted with AES-256 using `ENCRYPTION_KEY`
   env var), store `cardKey` on user record
5. Redirect to dashboard

> **Security note:** Never log or expose raw credentials. Use `node:crypto`
> `createCipheriv` with a per-user IV for credential encryption at rest.

```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32-byte hex

export function encrypt(text: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, KEY, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
        iv.toString("hex"),
        tag.toString("hex"),
        encrypted.toString("hex"),
    ].join(":");
}

export function decrypt(stored: string): string {
    const [ivHex, tagHex, encHex] = stored.split(":");
    const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(encHex, "hex")) + decipher.final("utf8");
}
```

**Acceptance criteria:**

- Credentials are encrypted before `prisma.user.update()` saves them
- `GET /za/v1/cards` is called to validate credentials before storing
- If validation fails, user sees a clear error (not a 500)
- `ENCRYPTION_KEY` is documented in `.env.example` with a generation command:
  `openssl rand -hex 32`

---

## Phase 11 — Notifications (Email)

**Goal:** Send email notifications when a rule fires with
`notifyChannel === "email"`.

Already partially implemented in Phase 5 webhook handler. This phase completes
the notification surface:

- [ ] Design a clean HTML email template (inline CSS, works in Gmail)
- [ ] Include: rule name, merchant, amount, outcome, link to dashboard
- [ ] Add a one-click "pause this rule" link (signed token, no login required)
- [ ] Add unsubscribe footer

> **Reference:** Resend docs —
> [https://resend.com/docs](https://resend.com/docs) Resend free tier: 3,000
> emails/month — sufficient for early users.

**Acceptance criteria:**

- Email is sent within 5 seconds of a triggering transaction
- Email contains merchant name, amount in rands, and outcome
- "Pause this rule" link works without requiring the user to log in

---

## Phase 12 — Simulation UI (Test Before Deploy)

**Goal:** Let users simulate a transaction against their current rules in the
browser before deploying to their real card. Reduces fear of "will this break my
card?"

### Simulation flow

1. Dashboard has a "Test rules" button
2. Opens a modal with fields: merchant name, amount (R), category, hour of day
3. Submit calls `POST /api/rules/simulate` with those values
4. API runs `compileRules()` then calls Investec's `POST .../code/execute`
   endpoint
5. Returns which rule would have fired (if any) and the outcome
6. Display: "Your rule 'Block fast food after 10pm' would have blocked this
   transaction"

```typescript
// app/api/rules/simulate/route.ts — pseudocode
export async function POST(req: NextRequest) {
  const { merchantName, amountRands, category, hour } = await req.json();
  const user = /* get from session */;
  const rules = /* get user's active rules */;
  const compiledCode = compileRules(rules, process.env.NEXTAUTH_URL!);

  const simRes = await investecFetch(`/za/v1/cards/${user.investecCardKey}/code/execute`, {
    method: 'POST',
    body: JSON.stringify({
      simulationcode: compiledCode,
      centsAmount: String(amountRands * 100),
      currencyCode: 'zar',
      merchantCode: 5411,
      merchantName,
      merchantCity: 'Cape Town',
      countryCode: 'ZA',
    }),
  });

  const result = await simRes.json();
  return NextResponse.json({ allowed: result.data?.result, compiledCode });
}
```

**Acceptance criteria:**

- Simulation form pre-fills with sensible defaults
- Result clearly shows allow / block and which rule matched
- Simulation never modifies the live card code (uses `/code/execute`, not
  `/code` + `/publish`)

---

## Phase 13 — knowledge/ File (Bounty Requirement)

The bounty requests a `./knowledge` file with tips, gotchas, and learnings.
Populate this throughout development.

```markdown
# knowledge/gotchas.md

## Investec Card API

- The `/code/execute` simulation endpoint is separate from `/code` + `/publish`.
  Always simulate first — it is cheap and catches compiler bugs before they
  touch your real card.
- `CardKey` (from GET /cards) is different from `AccountId`. Use `CardKey` for
  all card endpoints.
- The card code has a ~2 second execution timeout. Keep your `beforeTransaction`
  function fast. Avoid synchronous loops or heavy computation. fetch() calls are
  fine but must be non-blocking for the main allow/deny decision.
- The card code environment does not have access to `require()` or `import`.
  Pure ES2020 globals only.
- Sandbox and production use different base URLs:
    - Sandbox: https://openapisandbox.investec.com
    - Production: https://openapi.investec.com

## Rule Compiler

- All rules must merge into ONE `beforeTransaction` function. You cannot upload
  separate files.
- Priority order matters: the first matching block rule wins. Sort by `priority`
  ascending before compiling.
- Use `(authorization.centsAmount / 100)` for rand amounts. The API always
  provides cents.

## Webhook

- The card code fires a fetch() to your webhook URL during the transaction. This
  must respond within the card timeout, so keep the webhook handler fast. Log to
  DB synchronously but send emails asynchronously (don't await email sends
  inside the route).

## Auth

- NextAuth PrismaAdapter requires specific schema fields. Use the official
  schema from https://authjs.dev/reference/adapter/prisma

## Deployment

- Vercel free tier is sufficient for the bounty MVP.
- Set `USE_SANDBOX=true` in Vercel env vars during development. Switch to false
  only when testing with a real Investec account.
```

---

## Feature Backlog (post-MVP)

These are intentionally out of scope for the bounty but worth noting:

- **Rule templates** — pre-built rules users can install in one click ("Protect
  against impulse buy", "Family card allowance")
- **Rule sharing** — publish a rule to a community gallery
- **WhatsApp notifications** — via Twilio or Meta Cloud API; higher engagement
  than email
- **Monthly spending reports** — emailed PDF of spend blocked / saved by
  SpendGate rules
- **Multiple cards** — support users with more than one Investec card
- **Rule scheduling** — activate/deactivate rules on a cron schedule (e.g.
  "disable fast food block on weekends")
- **Merchant auto-complete** — fuzzy-search merchants from past transactions
  when building rules

---

## Submission Checklist (Bounty)

- [ ] Public GitHub repo with MIT license
- [ ] `README.md` explaining what SpendGate does, how to run it, and the
      monetisation angle
- [ ] `knowledge/gotchas.md` with API learnings
- [ ] `.env.example` with all required keys (no real values committed)
- [ ] Working demo video or GIF
- [ ] Submit at:
      [https://forms.office.com/r/CL3D9fJMaD](https://forms.office.com/r/CL3D9fJMaD)

---

## Key External References

| Resource                    | URL                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Bounty brief                | https://investec.gitbook.io/programmable-banking-community-wiki/get-building/build-events/q2-2026-bounty-challenge-or-api-side-hustle |
| Card API docs               | https://investec.gitbook.io/programmable-banking-community-wiki/get-started/card-quick-start-guide/how-to-use-the-cards-api           |
| Transaction API docs        | https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide/how-to-get-your-transaction-history |
| Auth quick start            | https://investec.gitbook.io/programmable-banking-community-wiki/get-started/api-quick-start-guide                                     |
| Investec Postman collection | https://www.postman.com/investec-open-api/programmable-banking/overview                                                               |
| Community sandbox simulator | https://github.com/devinpearson/programmable-banking-sim                                                                              |
| CLI deploy tool (community) | https://github.com/devinpearson/ipb                                                                                                   |
| NextAuth Prisma adapter     | https://authjs.dev/reference/adapter/prisma                                                                                           |
| Resend email                | https://resend.com/docs                                                                                                               |
| Investec npm wrapper        | https://www.npmjs.com/package/investec-api                                                                                            |
| Community projects repo     | https://github.com/Investec-Developer-Community/Community-Projects                                                                    |
| Slack community (#bounties) | https://investec-dev-com.slack.com/archives/C05MNBE2G3C                                                                               |
