import { describe, expect, it } from "vitest";
import { lastUsedSlot, options, relax, solve, validate } from "./index";
import { demoInput, redirectedInput } from "./fixture";

const placed = (r: ReturnType<typeof solve>) =>
  Object.values(r.slots).reduce((n, room) => n + Object.values(room).filter(Boolean).length, 0);

describe("solver", () => {
  it("places all 60 teams with the first notes", () => {
    const r = solve(demoInput);
    expect(r.ok).toBe(true);
    expect(placed(r)).toBe(60);
    expect(r.unplaced).toEqual([]);
    expect(r.conflictingConstraintIds).toEqual([]);
    expect(validate(demoInput, r)).toEqual([]);
  });

  it("leaves 8 teams unplaced once Judge B leaves at 16:00", () => {
    const r = solve(redirectedInput);
    expect(r.ok).toBe(false);
    expect(placed(r)).toBe(52);
    expect(r.unplaced).toHaveLength(8);
    const room1 = r.times.filter((t) => r.slots["Room 1"][t.start]);
    expect(room1).toHaveLength(7);
    expect(room1.at(-1)!.end).toBe("15:56");
    for (const t of r.times.filter((t) => t.start >= "15:56")) {
      expect(r.slots["Room 1"][t.start]).toBeNull();
    }
    expect(r.conflictingConstraintIds).toEqual(
      expect.arrayContaining(["c-jiwon-panel", "c-alex-end"]),
    );
    expect(validate(redirectedInput, r)).toEqual([]);
  });

  it("offers A (Room 1 alone from 16:00) and B (end by 17:24), both ok", () => {
    const r = solve(redirectedInput);
    const opts = options(redirectedInput, r);
    expect(opts).toHaveLength(2);
    const [a, b] = opts;
    expect(a).toMatchObject({
      id: "A",
      relaxesConstraintId: "c-jiwon-panel",
      author: "Ji-won",
      change: { kind: "panel_min_size", room: "Room 1", size: 1, from: "16:00" },
      summary: "Room 1 runs with Judge A alone after 16:00",
    });
    expect(b).toMatchObject({
      id: "B",
      relaxesConstraintId: "c-alex-end",
      author: "Alex",
      change: { kind: "end_by", time: "17:24" },
    });
    for (const o of opts) {
      const next = relax(redirectedInput, o.change);
      const res = solve(next);
      expect(res.ok).toBe(true);
      expect(placed(res)).toBe(60);
    }
    expect(lastUsedSlot(solve(relax(redirectedInput, a.change)))!.end).toBe("17:00");
  });

  it("option B's last slot runs 17:16–17:24", () => {
    const r = solve(relax(redirectedInput, { kind: "end_by", time: "17:24" }));
    expect(r.ok).toBe(true);
    expect(r.times.at(-1)).toEqual({ start: "17:16", end: "17:24" });
    expect(lastUsedSlot(r)).toEqual({ start: "17:16", end: "17:24" });
  });
});
