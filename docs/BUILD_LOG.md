# Build log

Everything below was built on 2026-11-09 during c0mpiled-17 Seoul (build time 10:00–15:00 KST). One row per step.

| Time (KST) | Card | What changed | How it was checked |
|---|---|---|---|
| 10:29 | 1 · Scaffold | Next.js app (App Router, TS, Tailwind), Liveblocks, Anthropic SDK, zod, vitest, Playwright installed; local env file copied, not tracked | Scaffold succeeded; `git status` shows no env file |
| 10:35 | 2 · Context | CLAUDE.md (rules, state shape, demo data, UI copy), docs/DESIGN.md (scope, non-goals, extension points), this log | Files reviewed before commit |
| 10:42 | 3 · Shared room | Liveblocks types and provider, home → `/s/[id]` with join screen (params/searchParams behind Suspense), top bar with presence avatars and colors by join order, Agent run / Schedule placeholder / Activity panels, temporary "Add test step", `scripts/verify-sync.mjs` | `npm run build` ok; `verify-sync.mjs` 2/2 ok ×3 against local prod server. Found: two clients opening a brand-new room at the same instant can lose the first write (initial storage race); script now joins in demo order |
