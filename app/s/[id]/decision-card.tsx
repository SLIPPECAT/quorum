"use client";

import { useMemo } from "react";
import { useSelf, useStorage } from "@liveblocks/react/suspense";
import { lastUsedSlot, relax, solve, type Change } from "@/lib/solver";
import { joinNames, ruleName, solverInputFrom } from "@/lib/agent/state";
import { Avatar, colorOf, usePeople } from "./people";
import { useRunAgent } from "./use-agent";

export function DecisionCard() {
  const decision = useStorage((root) => root.decision);
  const setup = useStorage((root) => root.setup);
  const constraints = useStorage((root) => root.constraints);
  const unplaced = useStorage((root) => root.schedule.unplaced.length);
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
        return [o.id, last ? `${fit}, last slot ${last.start}–${last.end}` : fit];
      }),
    );
  }, [decision, setup, constraints]);

  if (!decision || decision.chosen) return null;

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
                  &apos;s {rule ? ruleName(rule) : "rule"} · {results[o.id]}
                </span>
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
  const people = usePeople();
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
    </section>
  );
}
