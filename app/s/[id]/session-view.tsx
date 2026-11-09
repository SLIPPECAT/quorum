"use client";

import { useEffect, useState } from "react";
import { useStorage, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { Avatar, usePeople, type Person } from "./people";
import { AgentPanel } from "./agent-panel";
import { ActivityPanel } from "./activity-panel";
import { SchedulePanel } from "./schedule-panel";
import { DecisionCard, ResultSummary, WhyItConflicts } from "./decision-card";
import { joinNames } from "@/lib/agent/state";
import { useLoadDemo, useRunAgent } from "./use-agent";

export function SessionView() {
  const people = usePeople();
  const updatePresence = useUpdateMyPresence();
  const myColor = people.find((p) => p.isSelf)?.color ?? "";

  useEffect(() => {
    if (myColor) updatePresence({ color: myColor });
  }, [myColor, updatePresence]);

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <TopBar people={people} />
      <main className="flex flex-1 flex-wrap gap-4 p-4 lg:flex-nowrap">
        <div className="w-full lg:w-[360px] lg:shrink-0">
          <AgentPanel />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SchedulePanel />
          <WhyItConflicts />
        </div>
        <div className="flex w-full flex-col gap-4 lg:w-[320px] lg:shrink-0">
          <DecisionCard />
          <ResultSummary />
          <ActivityPanel />
        </div>
      </main>
    </div>
  );
}

function TopBar({ people }: { people: Person[] }) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const loadDemo = useLoadDemo();
  const agent = useRunAgent();
  const runningIndex = useStorage((root) => root.steps.findIndex((s) => s.status === "running"));
  const asked = useStorage((root) =>
    root.decision && !root.decision.chosen ? root.decision.askedAuthors.join("|") : "",
  );
  const locked = useStorage((root) => root.schedule.locked);
  const published = useStorage((root) => root.published ?? null);

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("name");
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-white px-4 py-3">
      <span className="font-display text-xl font-semibold">Quorum</span>
      <span className="text-sm text-muted">c0mpiled-17 Seoul / Judging schedule</span>
      {published && (
        <span data-testid="published" className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
          {published.note ?? `Published to ${published.teams} teams · ${published.time}`}
        </span>
      )}
      <div className="min-w-0" data-testid="status-badge">
        {locked ? (
          <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal">
            Locked · 0 conflicts
          </span>
        ) : runningIndex >= 0 ? (
          <span className="rounded-full bg-blue/10 px-2.5 py-1 text-xs font-medium text-blue">
            Running step {runningIndex + 1}
          </span>
        ) : asked ? (
          <span className="rounded-full border border-orange bg-warn-bg px-2.5 py-1 text-xs font-medium text-orange">
            Decision needed · {joinNames(asked.split("|"))}
          </span>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex -space-x-2" data-testid="avatars">
          {people.map((p) => (
            <Avatar key={p.connectionId} name={p.name} color={p.color} />
          ))}
        </div>
        <span className="text-sm text-muted">{people.length} here</span>
        <a
          href={`/w/demo/rules?name=${encodeURIComponent(people.find((p) => p.isSelf)?.name ?? "")}`}
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-blue hover:underline"
        >
          Rule map
        </a>
        <button
          onClick={share}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-page"
        >
          {copied ? "Copied" : "Share link"}
        </button>
        <button
          onClick={loadDemo}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-page"
        >
          Load demo data
        </button>
        <button
          onClick={agent.run}
          disabled={agent.disabled}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run agent
        </button>
        <div className="relative">
          <button
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-medium hover:bg-page"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="card absolute right-0 z-10 mt-1 w-44 p-1 shadow-lg">
              <button
                onClick={() => {
                  loadDemo();
                  setMenuOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-page"
              >
                Load demo data
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
