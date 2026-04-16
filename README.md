# SpendGate

> Programmable spending rules for your Investec card — built for humans, not
> just developers.

SpendGate lets Investec cardholders define plain-English spending rules through
a no-code interface. Rules are compiled into JavaScript and deployed directly to
the Investec Programmable Card via the official API, where they execute in
real-time on every transaction.

---

## The problem

Investec's Programmable Banking is genuinely powerful — you can run custom
JavaScript before every card transaction, block purchases, cap spending, and
fire webhooks. But to use it, you need to write code and deploy it manually
through the online IDE. That means the feature is invisible to the majority of
Investec clients who aren't developers.

SpendGate bridges that gap. It provides the authoring layer that the IDE doesn't
have: a rule builder where anyone can express what they want in plain English,
and SpendGate handles the compilation and deployment behind the scenes.

---

## What it does

**Build rules without code.** Complete a sentence: "When my [amount / merchant /
category / hour] [exceeds / contains / equals] [value], [block it / warn me]."
SpendGate turns that into valid card JavaScript and deploys it to your card.

**Block transactions at the source.** Rules run inside the Investec card
environment before a transaction completes. A matching block rule declines the
charge in real-time — not after the fact.

**Generate rules from your own history.** Browse your last 90 days of
transactions. Right-click any charge and SpendGate suggests 2–3 relevant rules
based on the merchant, amount, and time of day. One click to adopt, tweak, and
deploy.

**See what's working.** The dashboard shows how many times each rule has fired,
how much spending it has blocked this month, and when rules were last deployed.

**Test before you deploy.** Run a simulated transaction against your current
rules before publishing them to your real card — enter a merchant name, amount,
and time, and see exactly which rule would fire.

---

## Architecture

SpendGate is a Next.js 16 App Router application under `src/app/` using route
handlers in `src/app/api/` as the server boundary between the browser, Postgres,
and the Investec APIs. Investec credentials stay on the server; the browser only
sends user actions such as rule CRUD, simulation requests, and deployment
triggers.

```
Browser (Next.js + React UI)
    │
    │  Rule CRUD, transaction fetch, compile, simulate, deploy
    ▼
App Router route handlers (`src/app/api/*`)
    │
    ├── compile/route.ts             Compile current rules to card JavaScript
    ├── simulate/route.ts            Run local rule simulation against sample input
    ├── rules/route.ts               List/create persisted rules
    ├── rules/[id]/route.ts          Patch/delete rules + trigger redeploy
    ├── rules/deploy/route.ts        Redeploy active rules for a card key
    ├── deploy/route.ts              Compile + deploy an explicit ruleset/card key
    ├── transactions/route.ts        Fetch recent Investec transactions
    ├── suggest-rule/route.ts        Generate deterministic rule suggestions
    └── investec/webhook/route.ts    Receive card webhook events
    │
    ├── src/lib/compiler.ts          `SpendRule[]` → compiled card code
    ├── src/lib/simulator.ts         Local-first transaction simulation
    ├── src/lib/cardDeployer.ts      Simulate → save → publish card code
    ├── src/lib/investec-client.ts   OAuth2 token caching + authenticated fetches
    ├── src/lib/rule-suggester.ts    Transaction → suggested rules
    ├── src/lib/prisma.ts            Prisma client wrapper
    └── src/lib/generated/prisma/*   Generated Prisma client
    │
    ├── Investec Open API            OAuth2, accounts/transactions, programmable card endpoints
    ├── Investec Card Environment    Executes deployed card code and posts webhooks
    └── PostgreSQL via Prisma        `SpendRule`, `TransactionEvent`
```

### The deploy loop

1. User creates or toggles a rule in the UI
2. `POST /api/rules/deploy` is called automatically
3. `compileRules()` merges all active rules into a single JS file
4. The compiled code is tested against a dummy transaction via
   `/cards/:key/code/execute`
5. If simulation passes: the code is saved (`/cards/:key/code`) then published
   (`/cards/:key/publish`)
6. The card is live with the new ruleset within ~30 seconds

### The transaction feedback loop

When a rule fires on a real transaction, the compiled card code sends a webhook
to `POST /api/investec/webhook`. SpendGate logs the event, increments the rule's
trigger count, updates cumulative savings, and sends a notification if
configured.

---

## Tech stack

| Layer            | Choice                                     | Why                                                                  |
| ---------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Framework        | Next.js 16.2.2 (App Router)                | React 19 app with route handlers and server/client UI in one repo    |
| Language         | TypeScript                                 | Shared types for rules, transactions, API payloads, and UI state     |
| Database         | PostgreSQL via Prisma                      | Stores rules/events, supports migrations, and generates typed client |
| ORM client       | Prisma Client (`src/lib/generated/prisma`) | Typed DB access generated into the app source tree                   |
| Styling          | Tailwind CSS 4                             | Utility-first styling for the dashboard and rule builder             |
| UI primitives    | Base UI + shadcn/ui                        | Headless primitives with local component wrappers                    |
| Tables           | TanStack Table                             | Transaction table rendering, pagination, and column definitions      |
| State management | React hooks + Zustand                      | Local UI state plus shared rule suggestion/store state               |
| Integrations     | Investec Open API + Programmable Card      | Transaction retrieval and card-code deployment/publishing            |
| Notifications    | Resend (available dependency)              | Present in the repo for notification/email workflows as needed       |

---

## Monetisation

SpendGate charges a monthly subscription fee — the value proposition is time
saved and overspending prevented. Users who have blocked even one impulse
purchase have already justified the cost.

| Tier   | Price   | What you get                                                                |
| ------ | ------- | --------------------------------------------------------------------------- |
| Free   | R0/mo   | 2 active rules, basic block + notify                                        |
| Plus   | R79/mo  | Unlimited rules, email notifications, transaction history, rule suggestions |
| Family | R149/mo | Up to 4 cards, shared rule library, per-card dashboards                     |

Developer pricing is intentionally accessible because developers are the first
adopters and the community amplifiers. Normal-person pricing is slightly higher
because the onboarding and support overhead is greater.

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase free tier works)
- Investec Developer account with Programmable Banking enabled
- API credentials from the
  [Investec Developer Portal](https://developer.investec.com)

### Setup

```bash
git clone https://github.com/your-username/spendgate
cd spendgate
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Investec credentials, database URL, and NextAuth
secret. Generate an encryption key:

```bash
openssl rand -hex 32
```

Then:

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with a magic
link.

> **Use sandbox first.** Set `USE_SANDBOX=true` in your `.env.local` during
> development. The Investec sandbox is a full mock of the card environment and
> costs nothing to test against.

---

## Development notes

The card code runs in a constrained JavaScript environment inside Investec's
infrastructure. Key constraints:

- Execution timeout of ~2 seconds — keep `beforeTransaction` fast
- No `require()` or `import` — ES2020 globals only
- All rules compile to a single file — SpendGate merges everything into one
  `beforeTransaction` function
- `authorization.centsAmount` is always in cents — divide by 100 for rand
  amounts

See `knowledge/gotchas.md` for a full list of API quirks discovered during
development.

---

## Investec Programmable Banking

This project is built on
[Investec Programmable Banking](https://www.investec.com/en_za/banking/tech-professionals/programmable-banking.html),
which allows Investec clients to deploy JavaScript that runs before and after
every card transaction.

Community resources:

- [Developer Wiki](https://investec.gitbook.io/programmable-banking-community-wiki)
- [Community Projects](https://github.com/Investec-Developer-Community/Community-Projects)
- [Slack Community](https://investec-dev-com.slack.com)

---

## License

MIT — see `LICENSE`.

---

_Built for the
[Investec Q2 2026 API Side Hustle Bounty](https://investec.gitbook.io/programmable-banking-community-wiki/get-building/build-events/q2-2026-bounty-challenge-or-api-side-hustle)._
