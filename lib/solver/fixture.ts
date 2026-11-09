// Demo data from CLAUDE.md, as solver input.
import type { Constraint, SolverInput } from "./index";

export const demoTeams = Array.from({ length: 60 }, (_, i) => `Team ${String(i + 1).padStart(2, "0")}`);

export const demoConstraints: Constraint[] = [
  {
    id: "c-jiwon-panel",
    author: "Ji-won",
    sourceText: "Every room needs a 2-judge panel",
    kind: "panel_min_size",
    params: { size: 2 },
    status: "active",
  },
  {
    id: "c-alex-end",
    author: "Alex",
    sourceText: "Judging has to end by 17:00 — dinner starts right after",
    kind: "end_by",
    params: { time: "17:00" },
    status: "active",
  },
  {
    id: "c-alex-room4",
    author: "Alex",
    sourceText: "Judge C can't be in Room 4 — it's upstairs",
    kind: "judge_not_in_room",
    params: { judge: "C", room: "Room 4" },
    status: "active",
  },
  {
    id: "c-min-teams",
    author: "Min",
    sourceText: "Teams 12 and 13 share a member, don't schedule them at the same time",
    kind: "teams_not_concurrent",
    params: { teams: ["Team 12", "Team 13"] },
    status: "active",
  },
];

export const demoInput: SolverInput = {
  teams: demoTeams,
  rooms: ["Room 1", "Room 2", "Room 3", "Room 4"],
  judges: ["A", "B", "C", "D", "E", "F", "G", "H"],
  initialPanels: {
    "Room 1": ["A", "B"],
    "Room 2": ["C", "D"],
    "Room 3": ["E", "F"],
    "Room 4": ["G", "H"],
  },
  timing: { start: "15:00", end: "17:00", slotMinutes: 8 },
  constraints: demoConstraints,
};

/** Min's redirect comment on the Draft step, after parsing. */
export const redirectConstraint: Constraint = {
  id: "c-min-judgeb",
  author: "Min",
  sourceText: "B 심사위원님 4시 비행기라 먼저 가셔야 해요",
  kind: "judge_unavailable_after",
  params: { judge: "B", time: "16:00" },
  translation: "Judge B has to leave at 4 pm for a flight",
  status: "active",
};

export const redirectedInput: SolverInput = {
  ...demoInput,
  constraints: [...demoConstraints, redirectConstraint],
};
