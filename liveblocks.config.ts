import type { LiveList, LiveMap } from "@liveblocks/client";
import type { WorkspaceRule } from "@/lib/rules/types";

export type ConstraintKind =
  | "panel_min_size"
  | "end_by"
  | "judge_unavailable_after"
  | "judge_not_in_room"
  | "teams_not_concurrent";

export type Constraint = {
  id: string;
  author: string;
  sourceText: string;
  kind?: ConstraintKind | "unsupported";
  params?: { [key: string]: string | number | string[] | null };
  translation?: string;
  status: "active" | "relaxed" | "unsupported";
};

export type StepName = "parse" | "draft" | "validate" | "explain";

export type Step = {
  id: string;
  name: StepName;
  status: "pending" | "running" | "done" | "conflict";
  summary: string;
};

export type Comment = {
  id: string;
  author: string;
  text: string;
  translation?: string;
  redirected: boolean;
  agentReply?: string;
};

export type Setup = {
  teams: string[];
  rooms: string[];
  judges: string[];
  initialPanels: { [room: string]: string[] };
  timing: { start: string; end: string; slotMinutes: number };
};

export type Schedule = {
  // Same shape as lib/solver: room → slot start (HH:MM) → team / judges.
  slots: { [room: string]: { [time: string]: string | null } };
  panels: { [room: string]: { [time: string]: string[] } };
  unplaced: string[];
  conflictingConstraintIds: string[];
  changedCells: string[];
  locked: boolean;
};

export type DecisionOption = {
  id: string;
  relaxesConstraintId: string;
  author: string;
  change: { [key: string]: string | number };
  summary: string;
};

export type Decision = {
  conflictingConstraintIds: string[];
  askedAuthors: string[];
  options: DecisionOption[];
  chosen: string | null;
  chosenBy?: string;
  // Past compromise on the same rule, from the workspace rule map.
  recall?: string;
  // After locking: was the choice saved as a workspace rule?
  ruleStatus?: "saved" | "dismissed";
};

// `at` is epoch ms for measured durations (result summary); `time` is the HH:MM label.
export type FeedItem = { time: string; actor: string; text: string; at?: number };

// Schedule as first sent to teams (after the first clean run).
export type Published = { slots: Schedule["slots"]; time: string; teams: number };

export type Presence = { name: string; color: string };

export type Storage = {
  setup: Setup;
  constraints: LiveList<Constraint>;
  steps: LiveList<Step>;
  comments: LiveMap<string, LiveList<Comment>>;
  steers: LiveList<string>;
  schedule: Schedule;
  decision: Decision | null;
  feed: LiveList<FeedItem>;
  // Workspace rule map (room `ws-<id>`); an empty list in session rooms.
  rules: LiveList<WorkspaceRule>;
  published?: Published | null; // optional: absent in rule-map rooms
  // Demo: messages that arrived in the team chat, attached (in order) to the next redirect.
  inbox?: LiveList<{ author: string; text: string }>;
};

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: Storage;
  }
}

export const PRESENCE_COLORS = ["#2952CC", "#C2410C", "#0F766E"];

export const emptySetup = (): Setup => ({
  teams: [],
  rooms: [],
  judges: [],
  initialPanels: {},
  timing: { start: "", end: "", slotMinutes: 0 },
});

export const emptySchedule = (): Schedule => ({
  slots: {},
  panels: {},
  unplaced: [],
  conflictingConstraintIds: [],
  changedCells: [],
  locked: false,
});
