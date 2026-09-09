# SpendGate

SpendGate is a TypeScript application for experimenting with programmable spending controls on top of Investec banking APIs. It turns structured spending rules into executable card logic, supports simulation before deployment, and keeps rule/event state in PostgreSQL.

The current repository is a Next.js 16 application with server route handlers, a rule compiler/simulator, Investec integration helpers, Prisma persistence, and push-notification infrastructure.

> **Current status:** the core rule engine, Investec-facing helpers, API routes, persistence models, and deployment/simulation primitives are present. The README deliberately separates those implemented pieces from product ideas that may still be evolving.

## What is implemented

The repository currently contains:

- rule compilation from structured conditions/actions into card-executable JavaScript;
- local rule simulation before deployment;
- Investec API client helpers;
- card deployment/publishing logic;
- persisted `SpendRule` and `TransactionEvent` models;
- rule CRUD/server routes;
- deterministic rule suggestions;
- health, proxy, Investec, push, compile, and rule API routes;
- push-notification helper code;
- PostgreSQL access through Prisma 7 and the PostgreSQL adapter.

## Product idea

Investec Programmable Banking gives developers a powerful way to run JavaScript around card transactions. SpendGate explores a higher-level authoring layer where spending controls can be expressed as structured rules, validated locally, compiled, and then deployed to the programmable-card environment.

Examples of rule concepts the engine is designed to represent include:

- amount thresholds;
- merchant matching;
- category-based controls;
- time-based conditions;
- block/allow/notify-style actions;
- rule ordering and stop-processing behavior.

## Architecture

```text
Browser / client UI
        |
        v
Next.js 16 App Router
        |
        +--> app/api/compile
        +--> app/api/rules
        +--> app/api/suggest-rule
        +--> app/api/investec
        +--> app/api/push
        +--> app/api/proxy
        +--> app/api/health
        |
        v
Application helpers
        |
        +--> compiler.ts
        +--> simulator.ts
        +--> rule-suggester.ts
        +--> cardDeployer.ts
        +--> investec-client.ts
        +--> push.ts
        |
        +--------------------+
        |                    |
        v                    v
Investec APIs          PostgreSQL / Prisma
programmable card      rules + transaction events
```

## Engineering highlights

- **Compile-before-deploy workflow** — structured rules are converted into executable card code rather than manually authored for every change.
- **Simulation boundary** — rule behavior can be evaluated locally before publishing code to a real programmable-card environment.
- **Shared rule semantics** — conditions/actions are modeled as data so UI, simulation, persistence, and compilation can operate on the same contract.
- **Explicit deployment layer** — card deployment lives in `lib/cardDeployer.ts` instead of being mixed directly into UI components.
- **Typed persistence** — Prisma models store rule configuration and transaction outcomes using PostgreSQL.
- **Server-side credentials** — Investec credentials and deployment logic stay behind server routes/helpers rather than being exposed to browser code.

## Tech stack

| Area | Technology |
| --- | --- |
| Web | Next.js 16.2 + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/Base UI |
| Database | PostgreSQL |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| State | Zustand |
| Tables | TanStack Table |
| Validation | Zod |
| Notifications | Expo Server SDK + Resend dependency |
| Investec integration | custom server-side client/helpers |

## Repository structure

```text
app/                  Next.js pages and server route handlers
components/           application UI
context/              React context/state boundaries
hooks/                client hooks
lib/
  compiler.ts         structured rules -> card JavaScript
  simulator.ts        local rule evaluation
  rule-suggester.ts   transaction -> suggested rules
  cardDeployer.ts     card code deployment/publishing
  investec-client.ts  Investec API client
  prisma.ts           PostgreSQL/Prisma client
  push.ts             push notification helper
prisma/
  schema.prisma       SpendRule and TransactionEvent models
```

## Data model

The current Prisma schema stores two central concepts:

### `SpendRule`

A persisted rule with:

- label and active state;
- priority/order;
- stop-processing behavior;
- JSON conditions and actions;
- trigger count;
- cumulative saved amount.

### `TransactionEvent`

An observed rule outcome containing:

- related rule;
- outcome (`allowed`, `blocked`, `notified`, etc.);
- amount in cents;
- optional merchant name;
- currency and occurrence time.

## Getting started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL
- Investec API credentials for integration work

Install dependencies:

```bash
npm install
```

Configure a local environment with at least the database connection and any Investec credentials required by the routes you intend to exercise.

```env
DATABASE_URL=postgresql://...
```

Generate the Prisma client and apply your local schema/migrations as appropriate:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start the application:

```bash
npm run dev
```

The Next.js development server runs on the framework default port unless overridden locally.

## Development commands

```bash
npm run build
npm run lint
npm run format:check
npm run check
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Security notes

SpendGate operates around financial APIs and programmable-card behavior.

- Never expose Investec client secrets or access tokens to browser code.
- Keep `DATABASE_URL` and notification credentials out of source control.
- Simulate and validate generated rule code before publishing it.
- Treat any webhook/proxy surface as untrusted input and validate requests at the server boundary.
- Use sandbox/test environments before exercising real card behavior.

## Current direction

The strongest part of this repository is the programmable-spending engineering model: **rules as data -> simulation -> compilation -> controlled deployment -> event feedback**. UI, onboarding, authentication, pricing, and commercial packaging can evolve around that core without changing the README into a promise for features that are not yet implemented.
