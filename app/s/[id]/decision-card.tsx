"use client";

import { useMemo, useState } from "react";
import { useMutation, useRoom, useSelf, useStorage } from "@liveblocks/react/suspense";
import { lastUsedSlot, relax, solve, validate, type Change } from "@/lib/solver";
import { joinNames, judgeTimeBound, renotifyCount, ruleName, solverInputFrom } from "@/lib/agent/state";
import { Avatar, colorOf, usePeople } from "./people";
import { useRunAgent } from "./use-agent";

export function DecisionCard() {
  const decision = useStorage((root) => root.decision);
  const setup = useStorage((root) => root.setup);
  const constraints = useStorage((root) => root.constraints);
  const unplaced = useStorage((root) => root.schedule.unplaced.length);
  const published = useStorage((root) => root.published ?? null);
  const me = useSelf((s) => s.presence.name);
  const people = usePeople();
  const agent = useRunAgent();

  // Result line for each option, computed by the solver (no LLM).
  const results = useMemo(() => {
    if (!decision) return {};
    const input = solverInputFrom(setup, constraints);
    return Object.fromEntries(
      decision.options.map((o) => {
        const r = solve(relax(input, o.change as Change));
        const last = lastUsedSlot(r);
        const placed = setup.teams.length - r.unplaced.length;
        const fit = placed === setup.teams.length ? `all ${placed} teams fit` : `${placed} teams fit`;
        return [o.id, { text: last ? `${fit}, last slot ${last.start}–${last.end}` : fit, renotify: renotifyCount(published?.slots, r.slots) }];
      }),
    );
  }, [decision, setup, constraints, published]);

  if (!decision) return null;
  if (decision.chosen) return <RuleSuggestion />;

  const asked = decision.askedAuthors.includes(me);
  const myColor = colorOf(people, me);

  return (
    <section
      data-testid="decision-card"
      className="card p-5"
      style={asked ? { borderColor: myColor, borderWidth: 2 } : undefined}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: asked ? myColor : "#6b6b66" }}>
        Decision needed
      </p>
      <h2 className="font-display mt-1 text-lg font-semibold leading-snug">
        {unplaced} teams don&apos;t fit. Whose rule should bend?
      </h2>
      {decision.recall && (
        <p data-testid="recall" className="mt-1.5 rounded-lg bg-page px-2.5 py-1.5 text-xs text-muted">
          {decision.recall}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-sm text-muted">
        <div className="flex -space-x-1.5">
          {decision.askedAuthors.map((a) => (
            <Avatar key={a} name={a} color={colorOf(people, a)} size="sm" />
          ))}
        </div>
        Asked {joinNames(decision.askedAuthors)}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {decision.options.map((o) => {
          const rule = constraints.find((c) => c.id === o.relaxesConstraintId);
          return (
            <button
              key={o.id}
              data-testid={`option-${o.id}`}
              onClick={() => agent.choose(o.id)}
              disabled={!asked || agent.disabled}
              title={asked ? undefined : `Only ${joinNames(decision.askedAuthors)} can choose`}
              className="flex gap-3 rounded-lg border border-line p-3 text-left enabled:hover:border-ink disabled:cursor-not-allowed"
            >
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-page text-sm font-semibold">
                {o.id}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{o.summary}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Bends{" "}
                  <span className="font-medium" style={{ color: colorOf(people, o.author) }}>
                    {o.author}
                  </span>
                  &apos;s {rule ? ruleName(rule) : "rule"} · {results[o.id]?.text}
                </span>
                {published && (
                  <span data-testid={`renotify-${o.id}`} className="mt-1 block text-xs font-semibold">
                    Re-notify: {results[o.id]?.renotify} team{results[o.id]?.renotify === 1 ? "" : "s"}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        The owner of a rule decides. Choosing re-plans, checks for 0 conflicts and locks the schedule for everyone.
      </p>
    </section>
  );
}

/** Under the schedule: the colliding rules, each with its author. */
export function WhyItConflicts() {
  const ids = useStorage((root) => root.schedule.conflictingConstraintIds);
  const constraints = useStorage((root) => root.constraints);
  const counts = useStorage((root) => ({
    unplaced: root.schedule.unplaced.length,
    teams: root.setup.teams.length,
  }));
  const setupW = useStorage((root) => root.setup);
  const people = usePeople();
  const bound = judgeTimeBound(setupW, constraints);
  const rules = ids.map((id) => constraints.find((c) => c.id === id)).filter((c) => !!c);
  if (!rules.length) return null;

  return (
    <section data-testid="why" className="card p-5">
      <h3 className="font-display font-semibold">Why it conflicts</h3>
      <p className="mt-2 text-sm leading-relaxed">
        {rules.map((c, i) => (
          <span key={c.id}>
            {i > 0 && (i === rules.length - 1 ? ", and " : ", ")}
            <span className="font-medium" style={{ color: colorOf(people, c.author) }}>
              {c.author}
            </span>{" "}
            says &ldquo;{(c.translation ?? c.sourceText).replace(/[.。]\s*$/, "")}&rdquo;
          </span>
        ))}
        . Together they leave room for only {counts.teams - counts.unplaced} of {counts.teams} teams.
      </p>
      <p data-testid="judge-time" className="mt-2 text-sm font-medium">
        Judge time: {bound.minutes} min ÷ {bound.perTeam} min per team = at most {bound.maxTeams} teams
      </p>
    </section>
  );
}

/** After a choice locks the plan: offer to keep it as a workspace rule, with an impact preview computed by code. */
function RuleSuggestion() {
  const room = useRoom();
  const decision = useStorage((root) => root.decision);
  const setup = useStorage((root) => root.setup);
  const constraints = useStorage((root) => root.constraints);
  const schedule = useStorage((root) => root.schedule);
  const me = useSelf((s) => s.presence.name);
  const people = usePeople();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dismiss = useMutation(({ storage, self }) => {
    const d = storage.get("decision");
    if (d && d.chosenBy === self.presence.name) storage.set("decision", { ...d, ruleStatus: "dismissed" });
  }, []);

  // Impact preview: re-solve with the current rules and compare with the locked schedule.
  const preview = useMemo(() => {
    const input = solverInputFrom(setup, constraints);
    const result = solve(input);
    let changes = 0;
    for (const roomName of setup.rooms) {
      const now = schedule.slots[roomName] ?? {};
      const next = result.slots[roomName] ?? {};
      for (const t of new Set([...Object.keys(now), ...Object.keys(next)])) {
        if ((now[t] ?? null) !== (next[t] ?? null)) changes++;
      }
    }
    const violations = validate(input, result).length + result.unplaced.length;
    return { changes, violations };
  }, [setup, constraints, schedule]);

  if (!decision?.chosen || !schedule.locked || decision.ruleStatus === "dismissed") return null;
  const option = decision.options.find((o) => o.id === decision.chosen);
  const owner = decision.chosenBy ?? "";
  const isOwner = owner === me;

  if (decision.ruleStatus === "saved") {
    return (
      <section data-testid="rule-saved" className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal">Saved to the rule map</p>
        <p className="mt-1 text-sm">
          {owner}&apos;s choice is now a rule for all events. The agent will ask {owner} before using it.
        </p>
        <a
          href={`/w/demo/rules?name=${encodeURIComponent(me)}`}
          className="mt-2 inline-block text-sm font-medium text-blue hover:underline"
        >
          Open rule map →
        </a>
      </section>
    );
  }

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId: room.id, action: "saveRule", by: me }),
    });
    setSaving(false);
    if (!res.ok) setError("Couldn't save the rule. Try again.");
  };

  const ownerColor = colorOf(people, owner);
  return (
    <section
      data-testid="rule-suggestion"
      className="card p-5"
      style={isOwner ? { borderColor: ownerColor, borderWidth: 2 } : undefined}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: isOwner ? ownerColor : "#6b6b66" }}>
        Suggestion for {owner}
      </p>
      <h2 className="font-display mt-1 text-lg font-semibold leading-snug">Make it a rule for all events?</h2>
      {option && <p className="mt-1 text-sm text-muted">{option.summary}</p>}
      <p data-testid="impact-preview" className="mt-3 rounded-lg bg-page px-2.5 py-1.5 text-xs">
        Before saving: {preview.changes} change{preview.changes === 1 ? "" : "s"} in this plan,{" "}
        {preview.violations === 0
          ? "no conflicts with other rules."
          : `${preview.violations} conflict${preview.violations === 1 ? "" : "s"} with other rules.`}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={!isOwner || saving}
          title={isOwner ? undefined : `Only ${owner} can save this rule`}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save rule"}
        </button>
        <button
          onClick={dismiss}
          disabled={!isOwner || saving}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-page disabled:cursor-not-allowed disabled:opacity-40"
        >
          Not now
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-orange">{error}</p>}
      <p className="mt-3 text-xs text-muted">Rules belong to people. Only {owner} can save this one.</p>
    </section>
  );
}

/** After Locked: what the session handled, computed from shared state and feed timestamps. */
export function ResultSummary() {
  const locked = useStorage((root) => root.schedule.locked);
  const slots = useStorage((root) => root.schedule.slots);
  const published = useStorage((root) => root.published ?? null);
  const comments = useStorage((root) => root.comments);
  const chosen = useStorage((root) => (root.decision?.chosen ? 1 : 0));
  const feed = useStorage((root) => root.feed);
  if (!locked) return null;

  const all = Object.values(comments).flat();
  const messages = all.filter((c) => c.agentReply).length;
  const appliedQuietly = all.filter((c) => c.applied).length;
  const renotified = (published?.notifiedTotal ?? 0) + renotifyCount(published?.slots, slots);
  const first = feed.find((f) => f.text.includes("redirected the agent") && f.at);
  const lock = [...feed].reverse().find((f) => f.text.includes("locked the schedule") && f.at);
  const secs = first && lock ? Math.max(0, Math.round((lock.at! - first.at!) / 1000)) : null;
  const elapsed = secs === null ? "—" : `${secs} s`;
  const rows: [string, string][] = [
    ["Messages handled", String(messages)],
    ["Applied without asking", String(appliedQuietly)],
    ["Decisions", String(chosen)],
    ["Teams re-notified", String(renotified)],
    ["Cells moved by hand", "0"],
    ["First message → locked", elapsed],
  ];
  return (
    <section data-testid="result-summary" className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal">Locked · result</p>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
