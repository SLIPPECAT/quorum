# Quorum · design notes

Written at the start of the build (c0mpiled-17 Seoul, 2026-11-09). Context for both build sessions. `CLAUDE.md` holds the detailed rules, state shape and demo data.

## Problem
Plans with many stakeholders (event schedules, rosters, timetables) get made by one person prompting an AI and pasting the result into a group chat. Constraints arrive late, from different people, in different languages, and nobody can see why the plan changed.

## Scope today
| Priority | Feature | If missing |
|---|---|---|
| P0 | Join by link, presence, agent steps streaming live in every window | Not submittable |
| P0 | 4-step agent run (parse → draft → validate → explain) + schedule grid (rooms × time) | Not submittable |
| P1 | Comment on a step → redirect → re-plan, changed cells highlighted | Core of "multiplayer AI" |
| P1 key | Conflict → decision card for the owners of the colliding rules → choice re-plans and locks | Go/no-go at 12:00; otherwise pitched as next step |

## Not building today
Accounts and permissions, a session list, importing real event data, mobile layout, editing the grid by hand, more than one session template.

## Architecture
- **LLM (Claude)** turns human text into typed constraints, translates, and explains results. It never assigns the schedule.
- **Deterministic code (`lib/solver`)** places teams, validates, finds the smallest set of colliding constraints, and builds the decision options. Pure functions, unit-tested.
- **Liveblocks** holds presence and the shared state, so every window sees the same run.
- Every constraint stores its author from metadata, so the agent knows whom to ask.

## Extension points (named, not built)
- **Constraint kinds are a registry**: a new kind is a zod schema + a check function + a relax option.
- **Session templates**: the judging schedule is one template. Shift rosters and class timetables reuse the same loop with different setup data and kinds.
- **Decision policy**: today the owner of a rule decides. Later: votes, roles, or a deadline with a default.
- **Agent steps are data**: steps are a list in shared state, so more steps (e.g. "notify judges") slot in without UI changes.

## Platform direction (decided 11:55, after the core demo worked)

**Quorum is a plan that many people keep changing over a long time** — hours, then days, weeks, months, this year and next. Events, internal schedules, meetings and room bookings fight over the same people and places, so they belong on one board.

### Rule map at the center
- Rules attach to **people, places, the organization and plans**, not to a single plan.
- Every rule has an **owner**, a **scope**, its **source** (the original quote, who said it, when, in which plan) and a **history**.
- Plans borrow rules; decisions flow back into rules. Built today: `ws-demo` storage `rules`, the rule map screen (`/w/demo/rules`), saving a decision as a rule, proposed rules captured from redirect comments.

### The agent is the team's memory
It listens, writes things down, asks, applies, reminds and suggests cleanups. It has **no decision rights**.

| Level | What | Examples |
|---|---|---|
| Can do alone | Affects nobody and is reversible; always shown | Fill in a reversible default, write down what people say, remind of a past decision |
| Asks first | Touches someone's rule or interest | Use a rule that belongs to someone, change a rule's scope or period, retire or merge rules |
| Never (fixed floor) | Cannot be changed, even by admins | Apply a rule with no owner, settle a conflict quietly, keep a rule without a source |

Admins can edit the agent's policy, but not the floor.

### Handling gaps
- What the agent doesn't know is not a rule.
- Ambiguous → keep it **proposed** and ask back ("Today only, or always?").
- No owner → hand it to the plan's owner.
- Urgent → announce in advance the default that is easiest to undo and bends the fewest rules.

### Seven reviews
1. Impact preview (code) — what saving a rule would change in current plans
2. Contradiction check (code) — validate against the other rules
3. Similar rules (AI)
4. Scope check (AI)
5. Confirmation by the owners affected
6. Undo
7. Periodic review — often bent, unused, past their period

Built today: 1 and 2 on "Make it a rule for all events?", 5 as owner-only Save/Confirm, 3 and 7 as the rule map's Review panel (seeded data).

### Wedge → expansion
Start with teams that run events all year (judging, hackathons, conferences). The same rule map then extends to meetings, places and shifts. The workspace home shows those as **Preview** templates; they are not built.
