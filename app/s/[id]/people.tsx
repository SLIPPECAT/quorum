"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { PRESENCE_COLORS } from "@/liveblocks.config";

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

/** Color for an author name: their presence color if they're here, else gray. */
export function colorOf(people: Person[], name: string) {
  return people.find((p) => p.name === name)?.color ?? "#6b6b66";
}

export function Avatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" }) {
  return (
    <span
      title={name}
      data-name={name}
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-white font-semibold text-white ${
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
      }`}
      style={{ background: color || "#6b6b66" }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
