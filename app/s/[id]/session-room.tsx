"use client";

import { LiveList, LiveMap } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { emptySchedule, emptySetup } from "@/liveblocks.config";
import { SessionView } from "./session-view";

export function SessionRoom({ roomId, name }: { roomId: string; name: string }) {
  return (
    <LiveblocksProvider
      publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL || undefined}
    >
      <RoomProvider
        id={roomId}
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
          rules: new LiveList([]),
        })}
      >
        <ClientSideSuspense
          fallback={<div className="p-8 text-sm text-muted">Connecting…</div>}
        >
          <SessionView />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
