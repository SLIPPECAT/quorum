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
