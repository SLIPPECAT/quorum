// Demo v5 numbers: a message that fits, then one that collides (solver unchanged).
import { describe, expect, test } from "vitest";
import { options, relax, solve, validate, type Constraint, type SolverInput } from "../solver";
import { demoInput, redirectConstraint } from "../solver/fixture";
import { movedTeams, renotifyCount } from "./state";

const mentor: Constraint = {
  id: "c-alex-mentor",
  author: "Alex",
  sourceText: "Teams 01 and 02 share a mentor — don't run them at the same time",
  kind: "teams_not_concurrent",
  params: { teams: ["Team 01", "Team 02"] },
  status: "active",
};

describe("demo v5 flow", () => {
  const published = solve(demoInput).slots;
  const withMentor: SolverInput = { ...demoInput, constraints: [...demoInput.constraints, mentor] };
  const applied = solve(withMentor);

  test("mentor message fits: 60 placed, 0 violations, Teams 02–05 move", () => {
    expect(applied.unplaced).toHaveLength(0);
    expect(validate(withMentor, applied)).toHaveLength(0);
    expect(applied.ok).toBe(true);
    expect(movedTeams(published, applied.slots)).toEqual(["Team 02", "Team 03", "Team 04", "Team 05"]);
  });

  const withB: SolverInput = { ...withMentor, constraints: [...withMentor.constraints, redirectConstraint] };
  const conflict = solve(withB);

  test("then Judge B leaving: 52 placed, 8 left", () => {
    expect(conflict.unplaced).toHaveLength(8);
    expect(withB.teams.length - conflict.unplaced.length).toBe(52);
  });

  test("option A re-notifies 0 and option B 32 against the updated schedule", () => {
    const opts = options(withB, conflict);
    const a = opts.find((o) => o.change.kind === "panel_min_size")!;
    const b = opts.find((o) => o.change.kind === "end_by")!;
    const ra = solve(relax(withB, a.change));
    const rb = solve(relax(withB, b.change));
    expect(ra.ok && rb.ok).toBe(true);
    expect(renotifyCount(applied.slots, ra.slots)).toBe(0);
    expect(renotifyCount(applied.slots, rb.slots)).toBe(32);
  });
});
