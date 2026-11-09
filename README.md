# Quorum — Multiplayer AI for plans people have to agree on

**The AI is single-player. The decision is multiplayer.** Plans with many stakeholders (event schedules, rosters, timetables) get made by one person prompting an AI and pasting the result into a group chat. Quorum puts everyone in the same live agent session.

- Everyone watches the same agent run, live (presence + shared state)
- Anyone can comment on a step and redirect the agent — in any language
- Every constraint remembers who said it
- When constraints collide, the agent doesn't silently pick: it asks the people who own them to decide

## How it works

An LLM (Claude) turns human comments into structured constraints. A deterministic solver and validator assign the schedule, detect conflicts and generate options, so the plan is actually correct. Shared state runs on Liveblocks.

Decisions don't disappear when the session ends. Rules live on a **rule map** that belongs to the team, not to one plan: every rule has an owner, a scope, the quote it came from and a history. The agent is the team's memory. It writes rules down as people talk (a new rule starts as *proposed* until its owner confirms the scope), reminds people of the last time a rule was bent, previews what saving a rule would change, and asks the owner before using one. It never decides on its own.

> Nobody remembers every rule. Quorum writes them down as you talk, and asks the owner before it uses one.

## Demo

Live: https://quorum-c0mpiled17.vercel.app · Built at c0mpiled-17 Seoul, YC RFS Fall 2026 "Multiplayer AI".

1. Ji-won starts a session, loads the demo (60 teams, 8 judges, 4 rooms, 15:00–17:00) and runs the agent: 60 teams placed.
2. Min comments on the Draft step in Korean ("B 심사위원님 4시 비행기라 먼저 가셔야 해요") and redirects the agent.
3. The plan no longer fits (8 teams). The agent asks Ji-won and Alex, whose rules collide, and recalls that Ji-won allowed a solo judge in Tokyo.
4. Ji-won picks A → re-plan → 0 conflicts → locked for everyone → saved to the rule map for all events.

## Run locally

`npm install` · copy `.env.example` to `.env.local` (Liveblocks public/secret keys, Anthropic API key) · `npm run dev`

- `npx vitest run` — solver tests
- `node scripts/verify-sync.mjs [BASE]` — two browser windows check presence and shared state
- `node --env-file=.env.local scripts/reset-workspace.mjs` — reset the demo rule map

Built with Claude Code during the event. Production QA ran with gstack `/gstack-qa-only` (it caught a status badge that flickered after locking; fixed). Build log: `docs/BUILD_LOG.md`.
