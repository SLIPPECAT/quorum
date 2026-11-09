import type { Constraint } from "@/liveblocks.config";

/** Short human label for a parsed constraint, e.g. "Judge B · unavailable after 16:00". */
export function describeConstraint(c: Pick<Constraint, "kind" | "params">): string {
  const p = c.params ?? {};
  switch (c.kind) {
    case "panel_min_size":
      return `${p.room ?? "Every room"} · at least ${p.size} judge${p.size === 1 ? "" : "s"}${p.from ? ` from ${p.from}` : ""}`;
    case "end_by":
      return `Judging · ends by ${p.time}`;
    case "judge_unavailable_after":
      return `Judge ${p.judge} · unavailable after ${p.time}`;
    case "judge_not_in_room":
      return `Judge ${p.judge} · not in ${p.room}`;
    case "teams_not_concurrent":
      return `${(p.teams as string[]).join(" and ")} · not at the same time`;
    default:
      return "unsupported";
  }
}
