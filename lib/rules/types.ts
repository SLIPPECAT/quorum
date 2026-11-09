// Shared contract for the workspace rule map (room `ws-<id>`, storage `rules`).
export type RuleSubject = { type: "person" | "place" | "org" | "plan"; name: string };
export type RuleStatus = "proposed" | "active" | "retire_suggested";
export type WorkspaceRule = {
  id: string;
  text: string; // plain English rule
  subjects: RuleSubject[];
  owner: string; // display name, matches presence name exactly
  scope: string; // "Always" | "Today only" | "All events" ...
  status: RuleStatus;
  source: { quote: string; author: string; date: string; plan: string; href?: string };
  usedBy: { plan: string; href?: string; live: boolean }[];
  history: { date: string; actor: string; text: string }[];
  demo?: boolean; // seeded demo data, shown with a "demo data" tag
};
