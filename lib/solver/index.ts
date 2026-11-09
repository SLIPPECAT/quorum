// Deterministic scheduling solver. Pure functions, no I/O.
// The LLM never calls into scheduling decisions; it only produces Constraint objects.

export type ConstraintKind =
  | "panel_min_size"
  | "end_by"
  | "judge_unavailable_after"
  | "judge_not_in_room"
  | "teams_not_concurrent";

export type ConstraintParams = {
  size?: number;
  room?: string;
  from?: string; // "HH:MM"
  time?: string; // "HH:MM"
  judge?: string;
  teams?: string[];
};

export type Constraint = {
  id: string;
  author: string;
  sourceText: string;
  kind?: ConstraintKind;
  params?: ConstraintParams;
  translation?: string;
  status: "active" | "relaxed" | "unsupported";
};

export type Timing = { start: string; end: string; slotMinutes: number };

export type SolverInput = {
  teams: string[];
  rooms: string[];
  judges: string[];
  initialPanels: Record<string, string[]>; // room → judges
  timing: Timing;
  constraints: Constraint[];
};

export type SlotTime = { start: string; end: string };

export type SolverResult = {
  times: SlotTime[];
  slots: Record<string, Record<string, string | null>>; // room → slot start → team
  panels: Record<string, Record<string, string[]>>; // room → slot start → judges
  unplaced: string[];
  conflictingConstraintIds: string[];
  ok: boolean;
};

export type Change =
  | { kind: "panel_min_size"; room: string; size: number; from: string }
  | { kind: "end_by"; time: string };

export type DecisionOption = {
  id: string;
  relaxesConstraintId: string;
  author: string;
  change: Change;
  summary: string;
};

// ---------- time helpers ----------

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function active(input: SolverInput, kind: ConstraintKind): Constraint[] {
  return input.constraints.filter((c) => c.status === "active" && c.kind === kind);
}

/** Last allowed slot end: the earliest active end_by, otherwise timing.end. */
function horizon(input: SolverInput): number {
  const ends = active(input, "end_by")
    .map((c) => c.params?.time)
    .filter((t): t is string => !!t)
    .map(toMinutes);
  return ends.length ? Math.min(...ends) : toMinutes(input.timing.end);
}

/** Slots start at timing.start every slotMinutes; only those ending by the horizon. */
export function slotTimes(input: SolverInput): SlotTime[] {
  const step = input.timing.slotMinutes;
  const limit = horizon(input);
  const out: SlotTime[] = [];
  for (let s = toMinutes(input.timing.start); s + step <= limit; s += step) {
    out.push({ start: toHHMM(s), end: toHHMM(s + step) });
  }
  return out;
}

/**
 * Governing panel_min_size for a room at a slot. A rule with `from` applies to
 * slots that run at least partly after `from` (slot end > from). Room-scoped
 * rules beat global ones; among equals the later one in the list wins.
 */
function governingMinSize(input: SolverInput, room: string, slot: SlotTime): Constraint | null {
  let best: Constraint | null = null;
  let bestScore = -1;
  for (const c of active(input, "panel_min_size")) {
    const p = c.params ?? {};
    if (typeof p.size !== "number") continue;
    if (p.room && p.room !== room) continue;
    if (p.from && toMinutes(slot.end) <= toMinutes(p.from)) continue;
    const score = (p.room ? 2 : 0) + (p.from ? 1 : 0);
    if (score >= bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

function requiredSize(input: SolverInput, room: string, slot: SlotTime): number {
  return governingMinSize(input, room, slot)?.params?.size ?? 1;
}

/** Constraint that makes the judge unavailable for this slot, if any. */
function unavailableBy(input: SolverInput, judge: string, slot: SlotTime): Constraint | null {
  for (const c of active(input, "judge_unavailable_after")) {
    const p = c.params ?? {};
    if (p.judge === judge && p.time && toMinutes(slot.end) > toMinutes(p.time)) return c;
  }
  return null;
}

function bannedBy(input: SolverInput, judge: string, room: string): Constraint | null {
  for (const c of active(input, "judge_not_in_room")) {
    if (c.params?.judge === judge && c.params?.room === room) return c;
  }
  return null;
}

function concurrencyRules(input: SolverInput): Constraint[] {
  return active(input, "teams_not_concurrent").filter((c) => (c.params?.teams?.length ?? 0) > 1);
}

// ---------- solve ----------

export function solve(input: SolverInput): SolverResult {
  const times = slotTimes(input);
  const slots: SolverResult["slots"] = {};
  const panels: SolverResult["panels"] = {};
  for (const room of input.rooms) {
    slots[room] = {};
    panels[room] = {};
  }

  const causes = new Set<string>();
  const remaining = [...input.teams];
  const concurrency = concurrencyRules(input);

  for (const slot of times) {
    // 1. Panels: keep available initial members, then fill shortfalls with spare judges.
    const used = new Set<string>();
    const panel: Record<string, string[]> = {};
    const blockers: Record<string, string[]> = {};
    for (const room of input.rooms) {
      panel[room] = [];
      blockers[room] = [];
      for (const judge of input.initialPanels[room] ?? []) {
        const gone = unavailableBy(input, judge, slot);
        const banned = bannedBy(input, judge, room);
        if (gone) blockers[room].push(gone.id);
        else if (banned) blockers[room].push(banned.id);
        else if (!used.has(judge)) {
          panel[room].push(judge);
          used.add(judge);
        }
      }
    }
    const placedRooms: string[] = [];
    for (const room of input.rooms) {
      const need = requiredSize(input, room, slot);
      for (const judge of input.judges) {
        if (panel[room].length >= need) break;
        if (used.has(judge) || unavailableBy(input, judge, slot)) continue;
        const banned = bannedBy(input, judge, room);
        if (banned) {
          blockers[room].push(banned.id);
          continue;
        }
        panel[room].push(judge);
        used.add(judge);
      }
      if (panel[room].length >= need) {
        placedRooms.push(room);
        panels[room][slot.start] = panel[room];
      } else {
        // Room can't run this slot.
        panels[room][slot.start] = [];
        slots[room][slot.start] = null;
        const rule = governingMinSize(input, room, slot);
        if (rule) causes.add(rule.id);
        for (const id of blockers[room]) causes.add(id);
      }
    }

    // 2. Teams: lowest-numbered remaining team that doesn't clash with this slot's teams.
    const inSlot: string[] = [];
    for (const room of placedRooms) {
      const idx = remaining.findIndex((team) => {
        const clash = concurrency.find(
          (c) => c.params!.teams!.includes(team) && inSlot.some((t) => c.params!.teams!.includes(t)),
        );
        return !clash;
      });
      if (idx === -1) {
        slots[room][slot.start] = null;
        if (remaining.length) {
          for (const c of concurrency) {
            if (remaining.some((t) => c.params!.teams!.includes(t))) causes.add(c.id);
          }
        }
        continue;
      }
      const [team] = remaining.splice(idx, 1);
      slots[room][slot.start] = team;
      inSlot.push(team);
    }
  }

  const unplaced = remaining;
  let conflictingConstraintIds: string[] = [];
  if (unplaced.length) {
    for (const c of active(input, "end_by")) causes.add(c.id);
    conflictingConstraintIds = input.constraints.filter((c) => causes.has(c.id)).map((c) => c.id);
  }

  const result: SolverResult = { times, slots, panels, unplaced, conflictingConstraintIds, ok: false };
  result.ok = unplaced.length === 0 && validate(input, result).length === 0;
  return result;
}

// ---------- validate ----------

export type Violation = { constraintId?: string; message: string };

/** Independent check of a result against every active constraint. */
export function validate(input: SolverInput, result: SolverResult): Violation[] {
  const out: Violation[] = [];
  const limit = horizon(input);
  const seen = new Set<string>();

  for (const slot of result.times) {
    const judgesThisSlot = new Set<string>();
    const teamsThisSlot: string[] = [];
    for (const room of input.rooms) {
      const team = result.slots[room]?.[slot.start] ?? null;
      const panel = result.panels[room]?.[slot.start] ?? [];
      for (const judge of panel) {
        if (judgesThisSlot.has(judge)) out.push({ message: `Judge ${judge} is in two rooms at ${slot.start}` });
        judgesThisSlot.add(judge);
        const gone = unavailableBy(input, judge, slot);
        if (gone) out.push({ constraintId: gone.id, message: `Judge ${judge} is gone at ${slot.start}` });
        const banned = bannedBy(input, judge, room);
        if (banned) out.push({ constraintId: banned.id, message: `Judge ${judge} can't be in ${room}` });
      }
      if (!team) continue;
      if (seen.has(team)) out.push({ message: `${team} is scheduled twice` });
      seen.add(team);
      teamsThisSlot.push(team);
      const rule = governingMinSize(input, room, slot);
      if (panel.length < (rule?.params?.size ?? 1)) {
        out.push({ constraintId: rule?.id, message: `${room} at ${slot.start} has ${panel.length} judge(s)` });
      }
      if (toMinutes(slot.end) > limit) {
        const endBy = active(input, "end_by")[0];
        out.push({ constraintId: endBy?.id, message: `${room} runs past ${toHHMM(limit)}` });
      }
    }
    for (const c of concurrencyRules(input)) {
      const hits = teamsThisSlot.filter((t) => c.params!.teams!.includes(t));
      if (hits.length > 1) out.push({ constraintId: c.id, message: `${hits.join(" and ")} overlap at ${slot.start}` });
    }
  }
  return out;
}

// ---------- relax + options ----------

/** Returns a new input with one rule bent. The original constraint stays; an override is added or a time moved. */
export function relax(input: SolverInput, change: Change): SolverInput {
  const next: SolverInput = structuredClone(input);
  if (change.kind === "panel_min_size") {
    const base =
      active(next, "panel_min_size").find((c) => !c.params?.room) ?? active(next, "panel_min_size")[0];
    next.constraints.push({
      id: `${base?.id ?? "panel"}:relax:${change.room}:${change.from}`,
      author: base?.author ?? "",
      sourceText: `${change.room} may run with ${change.size} judge(s) from ${change.from}`,
      kind: "panel_min_size",
      params: { size: change.size, room: change.room, from: change.from },
      status: "active",
    });
  } else {
    const endBys = active(next, "end_by");
    if (endBys.length) for (const c of endBys) c.params = { ...c.params, time: change.time };
    else next.timing.end = change.time;
  }
  return next;
}

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_EXTRA_SLOTS = 30;

/** For each relaxable conflicting constraint, bend it, re-solve, and keep the options that work. */
export function options(input: SolverInput, result: SolverResult): DecisionOption[] {
  const out: Omit<DecisionOption, "id">[] = [];
  const times = result.times;

  for (const id of result.conflictingConstraintIds) {
    const c = input.constraints.find((x) => x.id === id);
    if (!c || c.status !== "active") continue;

    if (c.kind === "panel_min_size") {
      for (const room of input.rooms) {
        const empty = times.filter(
          (t) => result.slots[room][t.start] === null && governingMinSize(input, room, t)?.id === c.id,
        );
        if (!empty.length) continue;
        // Bend from the moment the panel lost someone (a judge leaving), else the first empty slot.
        const leaveTimes = (input.initialPanels[room] ?? [])
          .map((j) => unavailableBy(input, j, empty[0])?.params?.time)
          .filter((t): t is string => !!t)
          .map(toMinutes);
        const from = leaveTimes.length ? toHHMM(Math.min(...leaveTimes)) : empty[0].start;
        const change: Change = { kind: "panel_min_size", room, size: 1, from };
        const relaxed = solve(relax(input, change));
        if (!relaxed.ok) continue;
        const after = new Set(
          relaxed.times
            .filter((t) => toMinutes(t.end) > toMinutes(from))
            .flatMap((t) => relaxed.panels[room][t.start] ?? []),
        );
        const who = [...after];
        const summary =
          who.length === 1
            ? `${room} runs with Judge ${who[0]} alone after ${from}`
            : `${room} runs with a 1-judge panel after ${from}`;
        out.push({ relaxesConstraintId: c.id, author: c.author, change, summary });
      }
    }

    if (c.kind === "end_by" && c.params?.time) {
      const base = toMinutes(c.params.time);
      for (let k = 1; k <= MAX_EXTRA_SLOTS; k++) {
        const change: Change = { kind: "end_by", time: toHHMM(base + k * input.timing.slotMinutes) };
        const relaxed = solve(relax(input, change));
        if (!relaxed.ok) continue;
        const last = lastUsedSlot(relaxed);
        out.push({
          relaxesConstraintId: c.id,
          author: c.author,
          change,
          summary: `Judging ends at ${change.time}, last slot ${last ? `${last.start}–${last.end}` : "none"}`,
        });
        break;
      }
    }
  }

  return out.map((o, i) => ({ id: OPTION_LETTERS[i] ?? String(i + 1), ...o }));
}

/** Latest slot that has at least one team in it. */
export function lastUsedSlot(result: SolverResult): SlotTime | null {
  for (let i = result.times.length - 1; i >= 0; i--) {
    const t = result.times[i];
    if (Object.values(result.slots).some((room) => room[t.start])) return t;
  }
  return null;
}
