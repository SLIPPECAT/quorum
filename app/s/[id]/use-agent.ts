"use client";

import { useState } from "react";
import { LiveList, LiveMap } from "@liveblocks/client";
import { useMutation, useRoom, useStorage } from "@liveblocks/react/suspense";
import { emptySchedule, type Step, type StepName } from "@/liveblocks.config";
import { demoConstraints, demoInput } from "@/lib/solver/fixture";

export const STEP_NAMES: StepName[] = ["parse", "draft", "validate", "explain"];

const freshSteps = (): Step[] =>
  STEP_NAMES.map((name) => ({ id: `step-${name}`, name, status: "pending", summary: "" }));

export function clockTime() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

/** Load the demo setup and the four original notes (unparsed, with their authors). */
export function useLoadDemo() {
  return useMutation(({ storage, self }) => {
    const { constraints, ...setup } = demoInput;
    void constraints;
    storage.set("setup", setup);
    storage.set(
      "constraints",
      new LiveList(
        demoConstraints.map((c) => ({ id: c.id, author: c.author, sourceText: c.sourceText, status: "active" as const })),
      ),
    );
    storage.set("steps", new LiveList(freshSteps()));
    storage.set("comments", new LiveMap());
    storage.set("steers", new LiveList([]));
    storage.set("schedule", emptySchedule());
    storage.set("decision", null);
    storage.get("feed").push({ time: clockTime(), actor: self.presence.name, text: `${self.presence.name} loaded demo data` });
  }, []);
}

/** The browser that presses Run calls the four steps in order; every window watches storage. */
export function useRunAgent() {
  const room = useRoom();
  const [busy, setBusy] = useState(false);
  const anyRunning = useStorage((root) => root.steps.some((s) => s.status === "running"));
  const hasSetup = useStorage((root) => root.setup.teams.length > 0);

  const start = useMutation(({ storage, self }) => {
    storage.set("steps", new LiveList(freshSteps()));
    storage.get("feed").push({ time: clockTime(), actor: self.presence.name, text: `${self.presence.name} started the run` });
  }, []);

  const run = async () => {
    setBusy(true);
    start();
    try {
      // Make sure the reset reached the server before the API starts writing steps.
      for (let i = 0; i < 40 && room.getStorageStatus() !== "synchronized"; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      for (const step of STEP_NAMES) {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roomId: room.id, step }),
        });
        if (!res.ok) break;
      }
    } finally {
      setBusy(false);
    }
  };

  return { run, disabled: busy || anyRunning || !hasSetup };
}
