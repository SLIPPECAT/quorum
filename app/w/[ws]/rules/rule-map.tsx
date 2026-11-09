"use client";

import { useMutation, useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import { demoSimilarPairs } from "@/lib/rules/seed";
import type { RuleStatus, RuleSubject, WorkspaceRule } from "@/lib/rules/types";

const OWNER_COLORS: Record<string, string> = {
  "Ji-won": "#2952CC",
  Min: "#C2410C",
  Alex: "#0F766E",
};
const ownerColor = (name: string) => OWNER_COLORS[name] ?? "#6b6b66";

const GROUPS: { type: RuleSubject["type"]; title: string }[] = [
  { type: "person", title: "People" },
  { type: "place", title: "Places" },
  { type: "org", title: "Organization" },
  { type: "plan", title: "Plans" },
];

const STATUS_CHIP: Record<RuleStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-teal/10 text-teal" },
  proposed: { label: "Proposed · waiting for owner", cls: "bg-warn-bg text-orange" },
  retire_suggested: { label: "Retire suggested", cls: "bg-line text-muted" },
};

const BENT = /allowed|relaxed|waived|bent/i;
const isCapture = (r: WorkspaceRule) =>
  r.history.find((h) => h.actor === "Agent" && /^(Captured|Proposed)/.test(h.text));

export function RuleMap({ ws }: { ws: string }) {
  const rules = useStorage((root) => root.rules) as readonly WorkspaceRule[];
  const me = useSelf((s) => s.presence.name);

  const setStatus = useMutation(
    ({ storage }, id: string, status: RuleStatus | "retired") => {
      const list = storage.get("rules");
      const i = list.findIndex((r) => r.id === id);
      if (i < 0) return;
      const rule = list.get(i)!;
      const entry = {
        date: new Date().toISOString().slice(0, 10),
        actor: me,
        text:
          status === "active"
            ? rule.status === "proposed"
              ? "Confirmed"
              : "Kept after a retire suggestion"
            : "Retired",
      };
      if (status === "retired") {
        list.delete(i);
        return;
      }
      list.set(i, { ...rule, status, history: [...rule.history, entry] });
    },
    [me],
  );

  // "This week" is measured against the newest capture so the demo data stays meaningful.
  const captured = rules.filter(isCapture);
  const newest = captured.map((r) => isCapture(r)!.date).sort().at(-1);
  const weekStart = newest ? new Date(Date.parse(newest) - 7 * 86400000).toISOString().slice(0, 10) : "";
  const capturedThisWeek = captured.filter((r) => isCapture(r)!.date > weekStart).length;
  const waiting = rules.filter((r) => r.status === "proposed");

  const bent = rules.filter((r) => r.history.filter((h) => BENT.test(h.text)).length >= 2);
  const unused = rules.filter((r) => r.status === "active" && r.usedBy.length === 0);
  const expired = rules.filter((r) => r.status === "retire_suggested");
  const byId = new Map(rules.map((r) => [r.id, r]));
  const similar = demoSimilarPairs.filter(([a, b]) => byId.has(a) && byId.has(b));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">c0mpiled Ops · {ws}</p>
          <h1 className="font-display text-3xl font-semibold">Rule map</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Rules belong to people, places, the organization and plans. Each one has an owner, a source and a
            history.
          </p>
        </div>
        <Viewers me={me} />
      </header>

      <p className="card px-4 py-3 text-sm" data-testid="summary">
        Captured by the agent this week: <b>{capturedThisWeek}</b> · Waiting for review: <b>{waiting.length}</b>
      </p>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {rules.length === 0 && (
            <p className="card p-4 text-sm text-muted">No rules yet. Rules appear here once a decision is saved as one.</p>
          )}
          {GROUPS.map(({ type, title }) => {
            const group = rules.filter((r) => r.subjects[0]?.type === type);
            if (!group.length) return null;
            return (
              <section key={type} className="flex flex-col gap-3">
                <h2 className="font-display text-lg font-semibold">
                  {title} <span className="text-sm font-normal text-muted">{group.length}</span>
                </h2>
                {group.map((r) => (
                  <RuleCard key={r.id} rule={r} me={me} onAct={setStatus} />
                ))}
              </section>
            );
          })}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="card flex flex-col gap-3 p-4" aria-label="Review">
            <h2 className="font-display text-lg font-semibold">Review</h2>
            <ReviewGroup title="Waiting for the owner" items={waiting.map((r) => `${r.text} — ${r.owner}`)} />
            <ReviewGroup title="Often bent" items={bent.map((r) => `${r.text} — bent ${r.history.filter((h) => BENT.test(h.text)).length} times`)} />
            <ReviewGroup title="Not used by any plan" items={unused.map((r) => r.text)} />
            <ReviewGroup title="Past its period" items={expired.map((r) => r.text)} />
            <ReviewGroup
              title="Similar rules"
              items={similar.map(([a, b]) => `“${byId.get(a)!.text}” ≈ “${byId.get(b)!.text}”`)}
            />
          </section>
          <AgentPolicy />
        </aside>
      </div>
    </main>
  );
}

function Viewers({ me }: { me: string }) {
  const others = useOthers((list) => list.map((o) => o.presence.name).filter(Boolean));
  const names = [me, ...others];
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="flex">
        {names.map((n, i) => (
          <Avatar key={`${n}-${i}`} name={n} />
        ))}
      </span>
      Viewing as {me}
    </div>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      title={name}
      className={`-ml-1 flex shrink-0 items-center justify-center rounded-full border-2 border-white font-semibold text-white first:ml-0 ${
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
      }`}
      style={{ background: ownerColor(name) }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function RuleCard({
  rule,
  me,
  onAct,
}: {
  rule: WorkspaceRule;
  me: string;
  onAct: (id: string, status: RuleStatus | "retired") => void;
}) {
  const chip = STATUS_CHIP[rule.status];
  const needsAction = rule.status !== "active";
  const isOwner = rule.owner === me;
  return (
    <article
      className="card flex flex-col gap-3 p-4"
      data-rule-id={rule.id}
      data-status={rule.status}
      style={{ borderLeft: `4px solid ${ownerColor(rule.owner)}` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold">{rule.text}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.cls}`}>{chip.label}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {rule.subjects.map((s) => (
          <span key={`${s.type}-${s.name}`} className="rounded-full border border-line px-2 py-0.5 text-muted">
            {s.type} · {s.name}
          </span>
        ))}
        <span className="rounded-full bg-page px-2 py-0.5 text-ink">Scope: {rule.scope}</span>
        <span className="ml-auto flex items-center gap-1.5 text-muted">
          <Avatar name={rule.owner} size="sm" /> Owner {rule.owner}
        </span>
      </div>

      <blockquote className="border-l-2 border-line pl-3 text-sm text-muted">
        “{rule.source.quote}”
        <footer className="mt-0.5 text-xs">
          {rule.source.author} · {rule.source.date} · {rule.source.plan}
        </footer>
      </blockquote>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted">Used by</span>
        {rule.usedBy.length === 0 && <span className="text-muted">no plan</span>}
        {rule.usedBy.map((u) => (
          <span
            key={u.plan}
            className={`rounded-full px-2 py-0.5 ${u.live ? "bg-teal/10 text-teal" : "bg-line text-muted"}`}
          >
            {u.plan} · {u.live ? "Live" : "Preview"}
          </span>
        ))}
      </div>

      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none">History · {rule.history.length}</summary>
        <ul className="mt-1.5 flex flex-col gap-1">
          {rule.history.map((h, i) => (
            <li key={i}>
              <span className="tabular-nums">{h.date}</span> · {h.actor} · {h.text}
            </li>
          ))}
        </ul>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {rule.demo ? <span className="rounded bg-page px-1.5 py-0.5 text-[11px] text-muted">demo data</span> : <span />}
        {needsAction && (
          <div className="flex items-center gap-2">
            {!isOwner && <span className="text-xs text-muted">Only {rule.owner} can decide</span>}
            <button
              disabled={!isOwner}
              onClick={() => onAct(rule.id, "active")}
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white enabled:hover:opacity-90 disabled:opacity-35"
            >
              Confirm
            </button>
            <button
              disabled={!isOwner}
              onClick={() => onAct(rule.id, "retired")}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium enabled:hover:bg-page disabled:opacity-35"
            >
              Retire
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function ReviewGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Nothing to review</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1 text-sm">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CAN_DO_ALONE = [
  "Fill in a reversible default (it is marked as a default)",
  "Listen and write down what people say",
  "Remind you of a past decision",
];
const ASKS_FIRST = [
  "Use a rule that belongs to someone",
  "Change a rule's scope or period",
  "Retire or merge rules",
];
const NEVER = [
  "Apply a rule that has no owner",
  "Settle a conflict quietly",
  "Keep a rule without a source",
];

function AgentPolicy() {
  return (
    <section className="card flex flex-col gap-3 p-4" aria-label="Agent policy">
      <h2 className="font-display text-lg font-semibold">Agent policy</h2>
      <PolicyList title="Can do alone" items={CAN_DO_ALONE} />
      <PolicyList title="Asks first" items={ASKS_FIRST} />
      <PolicyList title="Never" items={NEVER} locked />
      <p className="text-xs text-muted">Read only. The “Never” list is a fixed floor, even for admins.</p>
    </section>
  );
}

function PolicyList({ title, items, locked }: { title: string; items: string[]; locked?: boolean }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <ul className="mt-1 flex flex-col gap-1 text-sm">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="w-4 shrink-0 text-center">
              {locked ? "🔒" : "•"}
            </span>
            {locked && <span className="sr-only">Locked: </span>}
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
