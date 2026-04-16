<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.

- Current framework/runtime in this repo: `next@16.2.2`, `react@19.2.4`, App
  Router under `src/app/`.
- Route-handler params follow Next 16 behavior in this codebase: dynamic params
  are typed as `Promise<...>` and awaited (see
  `src/app/api/rules/[id]/route.ts`).
- Rule DSL source of truth is `src/lib/types.ts` (`RuleCondition`, `RuleAction`,
  `SpendRule`, `Transaction`); keep API payloads and UI state aligned to these
  types.
- Rules are persisted in Postgres via Prisma model `SpendRule` with
  `conditions`/`actions` as `Json` (`prisma/schema.prisma`). API routes cast
  JSON back to typed arrays via local `toSpendRule(...)` helpers (see
  `src/app/api/compile/route.ts`, `src/app/api/simulate/route.ts`,
  `src/hooks/useRules.ts`).
- Compilation/simulation flow is currently local-first: `compileRules()` in
  `src/lib/compiler.ts`, `simulateTransaction()` in `src/lib/simulator.ts`; UI
  compiles in `useRules` and simulation panel calls simulator directly.
- Available API routes are `POST /api/compile`, `POST /api/simulate`,
  `GET/POST /api/rules`, `PATCH/DELETE /api/rules/[id]`.
- Investec deploy integration exists as utility code in
  `src/lib/cardDeployer.ts` but is not wired to an active API route in
  `src/app/api/`.
- Use existing scripts from `package.json`: `npm run dev`, `npm run build`,
  `npm run lint`, `npm run prisma:generate`, `npm run prisma:migrate`,
  `npm run prisma:studio`.
- Prisma client is configured with generator output `src/lib/generated/prisma`,
and runtime usage should import from `@/lib/generated/prisma/client` (for
example in `src/lib/prisma.ts`); keep generator config and import paths
consistent unless intentionally refactoring both.
    <!-- END:nextjs-agent-rules -->
