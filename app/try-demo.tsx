"use client";

import { useState } from "react";

const PEOPLE = [
  { name: "Ji-won", color: "#2952CC", role: "runs the plan" },
  { name: "Min", color: "#C2410C", role: "judges' contact" },
  { name: "Alex", color: "#0F766E", role: "venue" },
];

export function TryDemo() {
  const [id, setId] = useState<string | null>(null);

  return (
    <section className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-5 text-left">
      <h2 className="text-base font-semibold">Try the demo in 2 minutes</h2>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
        <li>Create a demo session and open the three windows below (Ji-won first).</li>
        <li>As Ji-won: <b>Load demo data</b>, then <b>Run agent</b>. Watch every window update.</li>
        <li>When 8 teams don&apos;t fit, only Ji-won and Alex can pick an option.</li>
        <li>Open <b>Rule map</b> to see who owns each rule and what the agent may do alone.</li>
      </ol>
      {id === null ? (
        <button
          className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          onClick={() => setId(`demo-${Math.random().toString(36).slice(2, 8)}`)}
        >
          Create a demo session
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {PEOPLE.map((p) => (
            <a
              key={p.name}
              href={`/s/${id}?name=${encodeURIComponent(p.name)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              Open as {p.name}
              <span className="text-xs font-normal text-zinc-500">· {p.role}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
