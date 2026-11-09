"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PREVIEW_PLANS = [
  { name: "Tokyo judging · Mar 2027", kind: "Event" },
  { name: "All-hands rehearsal · Nov 14", kind: "Meeting" },
  { name: "Room booking", kind: "Places" },
];

export function WorkspaceHome({ ws, name }: { ws: string; name: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const withName = name ? `?name=${encodeURIComponent(name)}` : "";

  const startSession = () => {
    const id = Math.random().toString(36).slice(2, 8);
    router.push(`/s/${id}${withName}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <span className="font-display text-xl font-semibold">Quorum</span>
        <span className="text-sm text-muted">c0mpiled Ops</span>
      </header>
      <div className="flex flex-1 flex-wrap gap-4 p-4 md:flex-nowrap">
        <nav className="card h-fit w-full p-2 text-sm md:w-56 md:shrink-0" aria-label="Workspace">
          <span className="block rounded-lg bg-page px-3 py-2 font-medium">Plans</span>
          <Link href={`/w/${ws}/rules${withName}`} className="block rounded-lg px-3 py-2 hover:bg-page">
            Rule map
          </Link>
          {["People", "Places"].map((item) => (
            <span
              key={item}
              aria-disabled="true"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-muted"
            >
              {item}
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px]">Preview</span>
            </span>
          ))}
        </nav>

        <main className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold">c0mpiled Ops</h1>
          <p className="mt-1 text-sm text-muted">
            Plans this team keeps changing together. They all share one rule map.
          </p>

          <section className="card mt-5 divide-y divide-line">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">Seoul judging · Nov 9</p>
                <p className="text-xs text-muted">Event · 60 teams, 8 judges, 4 rooms</p>
              </div>
              <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal">Live</span>
              <button
                onClick={startSession}
                className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                New session
              </button>
            </div>
            {PREVIEW_PLANS.map((plan) => (
              <button
                key={plan.name}
                onClick={() => setNotice(plan.name)}
                className="flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-page"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-muted">{plan.name}</p>
                  <p className="text-xs text-muted">{plan.kind}</p>
                </div>
                <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">Preview</span>
              </button>
            ))}
          </section>

          {notice && (
            <p role="status" className="mt-3 rounded-lg border border-line bg-white px-3 py-2 text-sm">
              <span className="font-medium">{notice}</span> is a preview: next template on the same rule map. Not built
              yet.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
