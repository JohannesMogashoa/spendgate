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

SpendGate is a Next.js 14 App Router application using server-side API routes as
a secure proxy between the browser and the Investec API. Investec credentials
never leave the server.

```
Browser (Next.js UI)
    │
    │  Rule CRUD, transaction fetch, simulate
    ▼
Next.js API Routes  (/app/api/*)
    │
    ├── lib/compiler.ts        Rule objects → JS string
    ├── lib/deployer.ts        Investec Card API calls (simulate → save → publish)
    ├── lib/investec-client.ts OAuth2 token management + fetch wrapper
    ├── lib/rule-suggester.ts  Transaction → rule suggestion logic
    └── lib/crypto.ts          AES-256-GCM credential encryption
    │
    ├── Investec Open API      GET /cards, POST /cards/:key/code, POST /cards/:key/publish
    ├── Investec Card Env      beforeTransaction() runs here, fires webhook back to SpendGate
    └── PostgreSQL (Prisma)    Users, Rules, TransactionEvents, DeploymentLogs
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

| Layer      | Choice                  | Why                                                      |
| ---------- | ----------------------- | -------------------------------------------------------- |
| Framework  | Next.js 14 (App Router) | Server components + API routes in one repo               |
| Language   | TypeScript              | End-to-end type safety for the rule DSL                  |
| Database   | PostgreSQL via Prisma   | Relational, easy migrations, works on Supabase free tier |
| Auth       | NextAuth (magic link)   | No passwords; low friction for first-time users          |
| Email      | Resend                  | Simple API, generous free tier, good deliverability      |
| Styling    | Tailwind CSS            | Fast to iterate, consistent design tokens                |
| Deployment | Vercel                  | Zero-config Next.js, free tier sufficient for MVP        |

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
