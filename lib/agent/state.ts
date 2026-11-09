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
