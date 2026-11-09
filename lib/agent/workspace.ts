// Workspace rule map helpers (server). Rules live in room `ws-demo`, storage `rules`.
import { LiveList } from "@liveblocks/client";
import type { Liveblocks } from "@liveblocks/node";
import type { Constraint, DecisionOption } from "@/liveblocks.config";
import type { WorkspaceRule } from "@/lib/rules/types";
import { demoRules } from "@/lib/rules/seed";

export const WS_ROOM = "ws-demo";
export const PLAN_NAME = "Seoul judging · Nov 9";
export const NEXT_PLAN = "Tokyo judging · Mar 2027";

export function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD
}

/** Rules in the workspace, or the demo seed when the workspace has none yet. */
export async function readWorkspaceRules(lb: Liveblocks): Promise<WorkspaceRule[]> {
  try {
    const doc = (await lb.getStorageDocument(WS_ROOM, "json")) as unknown as { rules?: WorkspaceRule[] };
    return doc.rules?.length ? doc.rules : demoRules;
  } catch {
    return demoRules;
  }
}

/** Mutate workspace rules, seeding them with the demo rules the first time. */
export async function mutateWorkspaceRules(lb: Liveblocks, fn: (rules: LiveList<WorkspaceRule>) => void) {
  await lb.getOrCreateRoom(WS_ROOM, { defaultAccesses: ["room:write"] });
  await lb.mutateStorage(WS_ROOM, ({ root }) => {
    let rules = root.get("rules") as LiveList<WorkspaceRule> | undefined;
    if (!rules) {
      rules = new LiveList<WorkspaceRule>(structuredClone(demoRules));
      root.set("rules", rules as never);
    }
    fn(rules);
  });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Last time (Tokyo, Mar 2026): Ji-won allowed a solo judge…" from a past bend of the same rule. */
export function recallFor(rules: WorkspaceRule[], constraint: Pick<Constraint, "sourceText">): string | undefined {
  const key = norm(constraint.sourceText);
  const rule = rules.find((r) => norm(r.text) === key || norm(r.source.quote) === key);
  const past = rule?.history.find((h) => /allow|chose|bent|bend|solo|relax|exception|waiv/i.test(h.text));
  if (!past) return undefined;
  // History text may lead with its own month: "2026-03 Tokyo: Ji-won allowed…".
  const lead = past.text.match(/^(\d{4})-(\d{2})\s+(.+)$/);
  const m = lead ?? past.date.match(/^(\d{4})-(\d{2})/);
  const when = m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : past.date;
  const body = lead ? lead[3] : past.text;
  const placed = body.match(/^([^:]{2,30}):\s*(.+)$/);
  return placed ? `Last time (${placed[1]}, ${when}): ${placed[2]}` : `Last time (${when}): ${body}`;
}

/** Plain-English, reusable rule for a chosen option (code, not LLM). */
export function ruleFromChoice(
  option: Pick<DecisionOption, "id" | "summary" | "change">,
  chooser: string,
  sessionHref: string,
): WorkspaceRule {
  const c = option.change;
  const date = today();
  const text =
    c.kind === "panel_min_size"
      ? "If a judge leaves early, that room may continue with a solo judge"
      : c.kind === "end_by"
        ? `If teams don't fit, judging may run until ${c.time}`
        : option.summary;
  return {
    id: `r-${Date.now().toString(36)}`,
    text,
    subjects:
      c.kind === "panel_min_size"
        ? [{ type: "org", name: "Judging panels" }]
        : [{ type: "plan", name: PLAN_NAME }],
    owner: chooser,
    scope: "All events",
    status: "active",
    source: { quote: `${chooser} chose ${option.id}: ${option.summary}`, author: chooser, date, plan: PLAN_NAME, href: sessionHref },
    usedBy: [
      { plan: PLAN_NAME, href: sessionHref, live: true },
      { plan: NEXT_PLAN, live: false },
    ],
    history: [{ date, actor: chooser, text: `Saved from the ${PLAN_NAME} decision (option ${option.id})` }],
  };
}

/** A captured, unconfirmed rule from a redirect comment. */
export function proposedRule(
  comment: { id: string; author: string; text: string },
  parsed: Pick<Constraint, "kind" | "params" | "translation">,
  label: string,
  sessionHref: string,
): WorkspaceRule {
  const p = parsed.params ?? {};
  const judge = typeof p.judge === "string" ? `Judge ${p.judge}` : null;
  const date = today();
  return {
    id: `r-${comment.id}`,
    text: parsed.translation ?? (comment.text || label),
    subjects: judge ? [{ type: "person", name: judge }] : [{ type: "plan", name: PLAN_NAME }],
    owner: comment.author,
    scope: "Today only?",
    status: "proposed",
    source: { quote: comment.text, author: comment.author, date, plan: PLAN_NAME, href: sessionHref },
    usedBy: [{ plan: PLAN_NAME, href: sessionHref, live: true }],
    history: [{ date, actor: "Agent", text: `Captured from ${comment.author}'s comment; waiting for ${comment.author} to confirm the scope` }],
  };
}
