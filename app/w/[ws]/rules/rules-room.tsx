"use client";

import { LiveList, LiveMap } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { emptySchedule, emptySetup } from "@/liveblocks.config";
import { demoRules } from "@/lib/rules/seed";
import { RuleMap } from "./rule-map";

export function RulesRoom({ ws, name }: { ws: string; name: string }) {
  return (
    <LiveblocksProvider
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL || undefined}
    >
      <RoomProvider
        id={`ws-${ws}`}
        initialPresence={{ name, color: "" }}
        initialStorage={() => ({
          setup: emptySetup(),
          constraints: new LiveList([]),
          steps: new LiveList([]),
          comments: new LiveMap(),
          steers: new LiveList([]),
          schedule: emptySchedule(),
          decision: null,
          feed: new LiveList([]),
          rules: new LiveList(demoRules),
        })}
      >
        <ClientSideSuspense fallback={<div className="p-8 text-sm text-muted">Connecting…</div>}>
          <RuleMap ws={ws} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
