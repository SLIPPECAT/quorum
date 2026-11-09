"use client";

import { useState } from "react";
import { LiveList, LiveMap } from "@liveblocks/client";
import { useMutation, useRoom, useStorage } from "@liveblocks/react/suspense";
import { emptySchedule, type Constraint, type Step, type StepName } from "@/liveblocks.config";
import { demoConstraints, demoInput } from "@/lib/solver/fixture";
import { relax, type Change } from "@/lib/solver";
import { solverInputFrom } from "@/lib/agent/state";

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

  /** Add a comment on a step. With redirect, queue it for parsing and re-plan from parse. */
  const addComment = useMutation(({ storage, self }, stepId: string, stepNo: number, text: string, redirect: boolean) => {
    const comments = storage.get("comments");
    if (!comments.get(stepId)) comments.set(stepId, new LiveList([]));
    const id = `cm-${Date.now().toString(36)}`;
    comments.get(stepId)!.push({ id, author: self.presence.name, text, redirected: redirect });
    if (!redirect) return;
    storage.get("steers").push(id);
    storage.set("steps", new LiveList(freshSteps()));
    storage.get("feed").push({
      time: clockTime(),
      actor: self.presence.name,
      text: `${self.presence.name} redirected the agent from step ${stepNo}`,
    });
  }, []);

  /** Bend the chosen rule in shared constraints, then re-plan from draft. */
  const applyChoice = useMutation(({ storage, self }, optionId: string) => {
    const decision = storage.get("decision");
    const option = decision?.options.find((o) => o.id === optionId);
    if (!decision || decision.chosen || !option) return false;
    const list = storage.get("constraints");
    const relaxed = relax(solverInputFrom(storage.get("setup"), list.toJSON() as Constraint[]), option.change as Change);
    for (const c of relaxed.constraints) {
      const i = list.findIndex((x) => x.id === c.id);
      const params = { ...c.params } as Constraint["params"];
      if (i >= 0) list.set(i, { ...list.get(i)!, params });
      else list.push({ id: c.id, author: c.author, sourceText: c.sourceText, kind: c.kind, params, status: "active" });
    }
    storage.set("decision", { ...decision, chosen: optionId, chosenBy: self.presence.name });
    const steps = storage.get("steps");
    steps.forEach((step, i) => {
      if (step.name !== "parse") steps.set(i, { ...step, status: "pending", summary: "" });
    });
    storage.get("feed").push({
      time: clockTime(),
      actor: self.presence.name,
      text: `${self.presence.name} chose ${option.id}: ${option.summary}`,
    });
    return true;
  }, []);

  const runSteps = async (from = 0) => {
    setBusy(true);
    try {
      // Make sure the reset reached the server before the API starts writing steps.
      for (let i = 0; i < 40 && room.getStorageStatus() !== "synchronized"; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      for (const step of STEP_NAMES.slice(from)) {
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

  const run = async () => {
    start();
    await runSteps();
  };

  const comment = async (stepId: string, stepNo: number, text: string, redirect: boolean) => {
    addComment(stepId, stepNo, text, redirect);
    if (redirect) await runSteps();
  };

  const choose = async (optionId: string) => {
    if (applyChoice(optionId)) await runSteps(1);
  };

  const disabled = busy || anyRunning || !hasSetup;
  return { run, comment, choose, disabled };
}
