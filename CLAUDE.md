# Quorum

A planning agent your whole team steers together, live. Built at c0mpiled-17 Seoul (YC RFS Fall 2026: Multiplayer AI).

## Rules for this build
- Hackathon: ~4 hours of building, solo. Build ONLY the demo path below. No auth, no permissions, no mobile, no i18n UI.
- Do only what the current card asks. No refactors, no extra features.
- UI copy is English. User comments can be in any language.
- The LLM never assigns the schedule. It only (1) turns human text into constraints and (2) explains results. Scheduling, validation, conflict detection and decision options are deterministic code in lib/solver.
- Every constraint carries its author (who wrote the note/comment). Author comes from metadata, never from the LLM.
- Next.js `cacheComponents` is on: anything reading `params`/`searchParams`/`cookies()` sits inside `<Suspense>`.
- Liveblocks: client `LiveblocksProvider` gets `baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL || undefined}`; server `new Liveblocks({ secret, baseUrl: process.env.LIVEBLOCKS_BASE_URL || undefined })`. Call `getOrCreateRoom(roomId, { defaultAccesses: ["room:write"] })` once per run before `mutateStorage`.
- Never print environment variable values.

## Stack
Next.js App Router + TypeScript + Tailwind · Liveblocks (presence + storage) · Anthropic SDK (`messages.parse` + zod via `zodOutputFormat`, model `claude-opus-5-5`, effort low) · vitest · Playwright (scripts only)

## Shared state (Liveblocks)
Presence: { name, color }
Storage:
- setup: { teams, rooms, judges, initialPanels, timing: { start, end, slotMinutes } }
- constraints: list of { id, author, sourceText, kind?, params?, translation?, status: active | relaxed | unsupported }
- steps: list of { id, name: parse | draft | validate | explain, status: pending | running | done | conflict, summary }
- comments: map stepId → list of { id, author, text, translation?, redirected, agentReply? }
- steers: list of comment ids waiting to be parsed
- schedule: { slots, panels, unplaced, conflictingConstraintIds, changedCells, locked }
- decision: { conflictingConstraintIds, askedAuthors, options: [{ id, relaxesConstraintId, author, change, summary }], chosen } | null
- feed: list of { time, actor, text }

## Constraint kinds
- panel_min_size { size, room?, from? }
- end_by { time }
- judge_unavailable_after { judge, time }
- judge_not_in_room { judge, room }
- teams_not_concurrent { teams }

## Demo data
- 60 teams (Team 01–60), 4 rooms (Room 4 is upstairs), judges A–H
- 15:00–17:00, 8-minute slots (6 pitch + 2 change) → 15 slots per room, 60 total, zero slack
- First panels: Room 1 A+B, Room 2 C+D, Room 3 E+F, Room 4 G+H
- Notes (author: text):
  - Ji-won: "Every room needs a 2-judge panel"
  - Alex: "Judging has to end by 17:00 — dinner starts right after"
  - Alex: "Judge C can't be in Room 4 — it's upstairs"
  - Min: "Teams 12 and 13 share a member, don't schedule them at the same time"
- Redirect comment (Min): "Judge B has a 4 pm flight, so they need to leave early" → judge_unavailable_after { B, 16:00 } (English, so no translation line; the translation feature stays for other languages)
- Expected after redirect: Room 1 runs 7 slots (15:00–15:56), then no 2-judge panel → 52 placed, 8 unplaced
- Options: A = panel_min_size 1 for Room 1 from 16:00 (bends Ji-won's rule) → 60 fit by 17:00 · B = end_by 17:24 (bends Alex's end time) → 61 capacity, last slot 17:16–17:24
- Why it is truly infeasible: judge time 900 min (7 × 120 + B 60) / 16 min per team = 56 max

## Demo scenario (windows: Ji-won, Min, Alex)
1. Ji-won: Load demo data → Run agent → 4 steps stream in all windows → 60 teams placed
2. Min: comment on Draft ("Judge B has a 4 pm flight…") → Comment & redirect → constraint with Min as author → re-plan
3. Validate: 8 teams unplaced → decision card for Ji-won and Alex
4. Ji-won picks A → re-plan → 0 conflicts → Locked → feed: "Ji-won chose A"

## Layout
Top bar · three columns: Agent run (left, ~360px) · Schedule (center, fluid) · Activity + Decision (right, ~320px). Columns wrap on narrow screens. Font Inter, headings Space Grotesk.
Presence colors in join order: #2952CC (blue), #C2410C (orange), #0F766E (teal). Changed/unplaced cells: background #FFEDD5, border #C2410C. Page background #F6F6F3, cards white with #E4E4DF border, radius 12px.

## UI copy
- Home: title "Quorum", button "New session"
- Join: "Join the judging schedule" · "c0mpiled-17 Seoul" · label "Your name" · button "Join session" · note "No account needed. You'll see the agent's progress live."
- Top bar: "Quorum" · "c0mpiled-17 Seoul / Judging schedule" · "N here" · buttons "Share link", "Run agent", menu item "Load demo data"
- Status badges: "Running step N" · "Decision needed · <names>" · "Locked · 0 conflicts"
- Steps: "1 · Parse constraints (LLM)", "2 · Draft schedule (solver)", "3 · Validate (code)", "4 · Explain (LLM)"
- Comment box: label "Comment on step N" · placeholder "Add a constraint the agent doesn't know…" · buttons "Comment", "Comment & redirect"
- Agent reply: "Added constraint: <kind summary>. Re-planning from step N."
- Schedule header: "60 teams · 8 judges · 4 rooms · 15:00–17:00 · 8-minute slots" · badge "<n> teams unplaced"
- Why box title: "Why it conflicts"
- Decision card: eyebrow "Decision needed" · title "<n> teams don't fit. Whose rule should bend?" · "Asked <names>" · option line 2 "Bends <author>'s <rule> · <result>" · footer "The owner of a rule decides. Choosing re-plans, checks for 0 conflicts and locks the schedule for everyone."
- Feed examples: "Ji-won started the run" · "Agent drafted a schedule, 0 conflicts" · "Min redirected the agent from step 2" · "Agent found a conflict and asked Ji-won and Alex" · "Ji-won chose A: Room 1 runs with Judge A alone after 16:00"

## README draft
# Quorum — Multiplayer AI for plans people have to agree on
**The AI is single-player. The decision is multiplayer.** Plans with many stakeholders (event schedules, rosters, timetables) get made by one person prompting an AI and pasting the result into a group chat. Quorum puts everyone in the same live agent session.
- Everyone watches the same agent run, live (presence + shared state)
- Anyone can comment on a step and redirect the agent — in any language
- Every constraint remembers who said it
- When constraints collide, the agent doesn't silently pick: it asks the people who own them to decide
## How it works
An LLM (Claude) turns human comments into structured constraints. A deterministic solver and validator assign the schedule, detect conflicts and generate options, so the plan is actually correct. Shared state runs on Liveblocks.
## Demo
Live: https://quorum-c0mpiled17.vercel.app · Built at c0mpiled-17 Seoul, YC RFS Fall 2026 "Multiplayer AI".
## Run locally
`npm install` · copy `.env.example` to `.env.local` (Liveblocks public/secret keys, Anthropic API key) · `npm run dev`

## Build docs
- Scope and extension points: docs/DESIGN.md
- After every card, add one row to docs/BUILD_LOG.md and commit it with the card.
- Next.js agent rules: @AGENTS.md
