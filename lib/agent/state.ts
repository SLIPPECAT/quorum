import type { Constraint, Setup } from "@/liveblocks.config";
import type { SolverInput } from "@/lib/solver";

/** Solver input from shared storage. Only parsed constraints go to the solver. */
type ReadonlySetup = { [K in keyof Setup]: Setup[K] extends string[] ? readonly string[] : unknown } & {
  timing: Setup["timing"];
};
type ReadonlyConstraint = { kind?: Constraint["kind"]; params?: object; [key: string]: unknown };

export function solverInputFrom(setup: ReadonlySetup, constraints: readonly ReadonlyConstraint[]): SolverInput {
  return {
    teams: [...setup.teams],
    rooms: [...setup.rooms],
    judges: [...setup.judges],
    initialPanels: structuredClone(setup.initialPanels) as SolverInput["initialPanels"],
    timing: { ...setup.timing },
    constraints: structuredClone(
      constraints.filter((c) => c.kind && c.kind !== "unsupported"),
    ) as SolverInput["constraints"],
  };
}

export function joinNames(names: readonly string[]) {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** "Bends <author>'s <rule>" wording for a constraint. */
export function ruleName(c: ReadonlyConstraint): string {
  const p = (c.params ?? {}) as Record<string, unknown>;
  if (c.kind === "panel_min_size") return `${p.size}-judge panel rule`;
  if (c.kind === "end_by") return `${p.time} end time`;
  if (c.kind === "judge_unavailable_after") return `Judge ${p.judge} leaving at ${p.time}`;
  if (c.kind === "judge_not_in_room") return `Judge ${p.judge} room rule`;
  if (c.kind === "teams_not_concurrent") return "team overlap rule";
  return "rule";
}

type Slots = { readonly [room: string]: { readonly [time: string]: string | null } };

/** Teams whose cell differs from the published schedule (moved or now unplaced). Teams back in their original cell don't count. */
export function renotifyCount(published: Slots | null | undefined, next: Slots): number {
  if (!published) return 0;
  const cellOf = (slots: Slots) => {
    const m = new Map<string, string>();
    for (const [room, times] of Object.entries(slots)) for (const [t, team] of Object.entries(times)) if (team) m.set(team, `${room}|${t}`);
    return m;
  };
  const before = cellOf(published);
  const after = cellOf(next);
  let n = 0;
  for (const [team, cell] of before) if (after.get(team) !== cell) n++;
  return n;
}

/** The moved teams themselves, sorted (same rule as renotifyCount). */
export function movedTeams(published: Slots | null | undefined, next: Slots): string[] {
  if (!published) return [];
  const cellOf = (slots: Slots) => {
    const m = new Map<string, string>();
    for (const [room, times] of Object.entries(slots)) for (const [t, team] of Object.entries(times)) if (team) m.set(team, `${room}|${t}`);
    return m;
  };
  const before = cellOf(published);
  const after = cellOf(next);
  return [...before].filter(([team, cell]) => after.get(team) !== cell).map(([team]) => team).sort();
}

/** "Team 02, 03, 04, 05" */
export function teamList(teams: string[]): string {
  return teams.map((t, i) => (i === 0 ? t : t.replace(/^Team /, ""))).join(", ");
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Judge time available before the end, divided by judge-minutes per team (panel size × slot length). */
export function judgeTimeBound(setup: ReadonlySetup, constraints: readonly ReadonlyConstraint[]) {
  const active = constraints.filter((c) => c.status === "active");
  const p = (c: ReadonlyConstraint) => (c.params ?? {}) as Record<string, unknown>;
  const ends = active.filter((c) => c.kind === "end_by" && typeof p(c).time === "string").map((c) => toMin(p(c).time as string));
  const start = toMin(setup.timing.start);
  const end = ends.length ? Math.min(...ends) : toMin(setup.timing.end);
  let minutes = 0;
  for (const judge of setup.judges as readonly string[]) {
    const leaves = active
      .filter((c) => c.kind === "judge_unavailable_after" && p(c).judge === judge && typeof p(c).time === "string")
      .map((c) => toMin(p(c).time as string));
    minutes += Math.max(0, Math.min(end, ...leaves) - start);
  }
  const panel = active.find((c) => c.kind === "panel_min_size" && !p(c).room && !p(c).from);
  const perTeam = (typeof p(panel ?? {}).size === "number" ? (p(panel!).size as number) : 1) * setup.timing.slotMinutes;
  return { minutes, perTeam, maxTeams: Math.floor(minutes / perTeam) };
}
