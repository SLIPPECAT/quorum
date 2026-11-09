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

Live: https://quorum-c0mpiled17.vercel.app · Video (87 s): https://www.youtube.com/watch?v=ECR_BctBs10 · Built at c0mpiled-17 Seoul, YC RFS Fall 2026 "Multiplayer AI".

Scenario: 40 minutes before judging, the schedule has already been sent to 60 teams. Then four messages arrive at once.

1. **Fits without a fight.** Alex: "Teams 01 and 02 share a mentor." The solver re-plans with no conflicts and 4 teams move. No one's rule bends, so the agent applies it without asking; Ji-won notifies those 4 teams.
2. **Already known.** Alex: keep Judge C out of Room 4. It's already on the rule map, so nothing changes and nobody explains it twice.
3. **A real conflict.** Min: "Judge B has a 4 pm flight." Now 8 teams don't fit, and no shuffling can fix it (judge time allows at most 56 teams). The agent asks Ji-won and Alex, whose rules collide, shows what each option costs (A re-notifies 0 teams, B re-notifies 32) and recalls that Ji-won allowed a solo judge in Tokyo.
4. **Decision → rule.** Ji-won picks A → 0 conflicts → locked for everyone. She saves it as a rule for all events after a code-computed impact preview; it appears live on the team's rule map.
5. **Not supported yet.** Ji-won: "Room 2's projector is broken until 15:30." The agent can't plan around room outages yet, so it saves a *proposed* rule instead of guessing.

## Try it (2 minutes)

1. Open https://quorum-c0mpiled17.vercel.app → **Create a demo session**, then **Open as Ji-won** first, then **Min** and **Alex** (each opens in a new tab; names are case-sensitive).
2. Or use **New session** and share the link yourself.
3. As Ji-won: **Load demo data** → **Run agent**. Watch the steps stream into all three windows.
4. When "8 teams don't fit" appears, the decision card is clickable only for Ji-won and Alex. Pick an option as Ji-won.
5. Click **Rule map** to see the team's rules, who owns them, and what the agent may do alone.

## Next steps

- Direct edits (swap rooms, reassign judges, add or withdraw teams) checked by the same validator, asking a rule's owner before bending it
- Minimal-change re-planning that keeps published slots fixed (today the solver re-plans from scratch, which is why option B moves 32 teams)
- Buffers and breaks, and more templates on the same rule map (hiring days, conference sessions, shift rosters)

## Run locally

`npm install` · copy `.env.example` to `.env.local` (Liveblocks public/secret keys, Anthropic API key) · `npm run dev`

- `npx vitest run` — solver tests
- `node scripts/verify-sync.mjs [BASE]` — two browser windows check presence and shared state
- `node --env-file=.env.local scripts/reset-workspace.mjs` — reset the demo rule map

Built with Claude Code during the event. Production QA ran with gstack `/gstack-qa-only` (it caught a status badge that flickered after locking; fixed). Build log: `docs/BUILD_LOG.md`.
