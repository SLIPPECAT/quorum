"use client";

import { useEffect, useState } from "react";
import { useOthers, useSelf, useStorage, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { PRESENCE_COLORS } from "@/liveblocks.config";
import { AgentPanel } from "./agent-panel";
import { ActivityPanel } from "./activity-panel";
import { SchedulePanel } from "./schedule-panel";
import { useLoadDemo, useRunAgent } from "./use-agent";

export type Person = { connectionId: number; name: string; color: string; isSelf: boolean };

/** Everyone in the room, in join order, with a presence color assigned by that order. */
export function usePeople(): Person[] {
  const self = useSelf((me) => ({ connectionId: me.connectionId, name: me.presence.name }));
  const others = useOthers((list) =>
    list.map((o) => ({ connectionId: o.connectionId, name: o.presence.name })),
  );
  return [{ ...self, isSelf: true }, ...others.map((o) => ({ ...o, isSelf: false }))]
    .filter((p) => p.name)
    .sort((a, b) => a.connectionId - b.connectionId)
    .map((p, i) => ({ ...p, color: PRESENCE_COLORS[i % PRESENCE_COLORS.length] }));
}

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
        <SchedulePanel />
        <div className="w-full lg:w-[320px] lg:shrink-0">
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
      <div className="min-w-0" data-testid="status-badge">
        {runningIndex >= 0 && (
          <span className="rounded-full bg-blue/10 px-2.5 py-1 text-xs font-medium text-blue">
            Running step {runningIndex + 1}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex -space-x-2" data-testid="avatars">
          {people.map((p) => (
            <Avatar key={p.connectionId} name={p.name} color={p.color} />
          ))}
        </div>
        <span className="text-sm text-muted">{people.length} here</span>
        <button
          onClick={share}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-page"
        >
          {copied ? "Copied" : "Share link"}
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

export function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span
      title={name}
      data-name={name}
      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white"
      style={{ background: color || "#6b6b66" }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
