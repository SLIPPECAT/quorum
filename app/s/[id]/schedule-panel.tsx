"use client";

import { useState } from "react";
import { useStorage } from "@liveblocks/react/suspense";
import { toHHMM, toMinutes } from "@/lib/solver";
import { colorOf, usePeople } from "./people";

const FOLD_AFTER = 4;

type Row =
  | { type: "panel"; key: string; panels: (readonly string[])[] }
  | { type: "slot"; key: string; start: string; end: string; teams: (string | null)[]; empty: boolean[] }
  | { type: "more"; key: string; count: number };

export function SchedulePanel() {
  const setup = useStorage((root) => root.setup);
  const schedule = useStorage((root) => root.schedule);
  const [expanded, setExpanded] = useState(false);
  const people = usePeople();
  // Changed cells take the color of whoever redirected the agent last.
  const redirector = useStorage((root) => {
    const all = Object.values(root.comments).flat().filter((c) => c.redirected);
    all.sort((a, b) => a.id.localeCompare(b.id));
    return all.at(-1)?.author ?? null;
  });
  const changeColor = redirector ? colorOf(people, redirector) : "#C2410C";
  const changed = new Set(schedule.changedCells);

  const rooms = setup.rooms;
  const times = Object.keys(schedule.slots[rooms[0]] ?? {}).sort();
  const hasSchedule = rooms.length > 0 && times.length > 0;
  const unplaced = schedule.unplaced;

  // Slot rows, with a Panel row whenever any room's panel changes (a new time block).
  const all: Row[] = [];
  let lastPanels = "";
  for (const start of times) {
    const panels = rooms.map((r) => schedule.panels[r]?.[start] ?? []);
    const sig = JSON.stringify(panels);
    if (sig !== lastPanels) {
      all.push({ type: "panel", key: `panel-${start}`, panels });
      lastPanels = sig;
    }
    const teams = rooms.map((r) => schedule.slots[r]?.[start] ?? null);
    all.push({
      type: "slot",
      key: start,
      start,
      end: toHHMM(toMinutes(start) + setup.timing.slotMinutes),
      teams,
      empty: teams.map((t) => t === null),
    });
  }

  // Fold: keep the first slots, panel changes and any slot with an empty cell; collapse the rest.
  const rows: Row[] = [];
  let slotIndex = 0;
  let hidden = 0;
  for (const row of all) {
    const keep =
      expanded ||
      row.type === "panel" ||
      (row.type === "slot" && (slotIndex < FOLD_AFTER || row.empty.some(Boolean)));
    if (row.type === "slot") slotIndex++;
    if (keep) {
      if (hidden) rows.push({ type: "more", key: `more-${row.key}`, count: hidden });
      hidden = 0;
      rows.push(row);
    } else hidden++;
  }
  if (hidden) rows.push({ type: "more", key: "more-end", count: hidden });

  return (
    <section className="card min-w-0 flex-1 p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-semibold">Schedule</h2>
        {setup.teams.length > 0 && (
          <span className="text-sm text-muted">
            {setup.teams.length} teams · {setup.judges.length} judges · {rooms.length} rooms ·{" "}
            {setup.timing.start}–{setup.timing.end} · {setup.timing.slotMinutes}-minute slots
          </span>
        )}
        {hasSchedule && unplaced.length > 0 && (
          <span className="ml-auto rounded-full border border-orange bg-warn-bg px-2.5 py-0.5 text-xs font-medium text-orange">
            {unplaced.length} teams unplaced
          </span>
        )}
      </div>

      {!hasSchedule ? (
        <p className="mt-6 text-sm text-muted">No schedule yet. Run the agent to draft one.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-1 text-sm" data-testid="schedule">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="w-28 font-medium">Time</th>
                {rooms.map((r) => (
                  <th key={r} className="font-medium">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                if (row.type === "panel")
                  return (
                    <tr key={row.key} className="text-xs text-muted">
                      <td className="pt-2">Panel</td>
                      {row.panels.map((p, i) => (
                        <td key={i} className="pt-2">
                          {p.length ? p.join(" + ") : "No panel"}
                        </td>
                      ))}
                    </tr>
                  );
                if (row.type === "more")
                  return (
                    <tr key={row.key}>
                      <td colSpan={rooms.length + 1}>
                        <button
                          onClick={() => setExpanded(true)}
                          className="w-full rounded-lg py-1 text-xs text-muted hover:bg-page"
                        >
                          + {row.count} more slots
                        </button>
                      </td>
                    </tr>
                  );
                return (
                  <tr key={row.key}>
                    <td className="text-xs tabular-nums text-muted">
                      {row.start}–{row.end}
                    </td>
                    {row.teams.map((team, i) => {
                      const isChanged = team !== null && changed.has(`${rooms[i]}|${row.start}`);
                      return (
                        <td
                          key={i}
                          data-testid={team ? "placed" : "empty"}
                          data-changed={isChanged || undefined}
                          className={`rounded-lg border px-2 py-1.5 ${
                            team ? "border-line bg-white" : "border-orange bg-warn-bg text-orange"
                          }`}
                          style={isChanged ? { borderColor: changeColor, background: `${changeColor}1A` } : undefined}
                        >
                          {team ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {expanded && (
            <button onClick={() => setExpanded(false)} className="mt-1 text-xs text-muted hover:underline">
              Collapse
            </button>
          )}
        </div>
      )}

      {hasSchedule && unplaced.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted">Unplaced</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {unplaced.map((t) => (
              <span key={t} className="rounded-lg border border-orange bg-warn-bg px-2 py-1 text-xs text-orange">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
