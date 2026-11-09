"use client";

import { useStorage } from "@liveblocks/react/suspense";

export function ActivityPanel() {
  const feed = useStorage((root) => root.feed);
  const items = [...feed].reverse();

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-semibold">Activity</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nothing yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3" data-testid="feed">
          {items.map((item, i) => (
            <li key={`${item.time}-${i}`} className="text-sm">
              <span className="mr-2 text-xs tabular-nums text-muted">{item.time}</span>
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
