"use client";

import { useState } from "react";
import { useMutation, useSelf, useStorage } from "@liveblocks/react/suspense";
import type { Step, StepName } from "@/liveblocks.config";
import { Avatar, colorOf, usePeople } from "./people";
import { clockTime, useRunAgent } from "./use-agent";
import { renotifyCount } from "@/lib/agent/state";

const STEP_LABELS: Record<StepName, string> = {
  parse: "Parse constraints (LLM)",
  draft: "Draft schedule (solver)",
  validate: "Validate (code)",
  explain: "Explain (LLM)",
};

export function AgentPanel() {
  const steps = useStorage((root) => root.steps);
  const comments = useStorage((root) => root.comments);
  const people = usePeople();
  const agent = useRunAgent();
  const [selected, setSelected] = useState(0);
  const [text, setText] = useState("");
  const me = useSelf((s) => s.presence.name);
  const published = useStorage((root) => root.published ?? null);
  const slots = useStorage((root) => root.schedule.slots);
  // The plan owner is whoever loaded the plan (Ji-won in the demo).
  const owner = useStorage((root) => root.feed.find((f) => f.text.endsWith("loaded demo data"))?.actor ?? "");
  const toNotify = renotifyCount(published?.slots, slots);
  const notify = useMutation(({ storage, self }, stepId: string, commentId: string) => {
    const pub = storage.get("published");
    if (!pub) return;
    const sched = storage.get("schedule");
    const n = renotifyCount(pub.slots, sched.slots);
    const note = `Update sent to ${n} team${n === 1 ? "" : "s"} · ${clockTime()}`;
    // The sent schedule becomes the new baseline for later re-notify counts.
    storage.set("published", { ...pub, slots: sched.slots, note, notifiedTotal: (pub.notifiedTotal ?? 0) + n });
    const thread = storage.get("comments").get(stepId);
    const i = thread ? thread.findIndex((c) => c.id === commentId) : -1;
    if (thread && i >= 0) thread.set(i, { ...thread.get(i)!, notified: note });
    storage.get("feed").push({ time: clockTime(), at: Date.now(), actor: self.presence.name, text: `${self.presence.name} sent the update to ${n} teams` });
  }, []);
  // Temporary test control, only with ?debug (used by scripts/verify-sync.mjs). Client-only render.
  const showDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");

  // Temporary: lets the sync check add a step from one window and see it in another.
  const addTestStep = useMutation(({ storage }) => {
    const list = storage.get("steps");
    list.push({
      id: `test-${Date.now()}`,
      name: "parse",
      status: "pending",
      summary: `Test step ${list.length + 1}`,
    });
  }, []);

  const target = steps[Math.min(selected, steps.length - 1)];
  const submit = async (redirect: boolean) => {
    const value = text.trim();
    if (!value || !target) return;
    setText("");
    await agent.comment(target.id, Math.min(selected, steps.length - 1) + 1, value, redirect);
  };

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-semibold">Agent run</h2>
      {steps.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No run yet.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-1" data-testid="steps">
          {steps.map((step, i) => (
            <li key={step.id} data-testid="step">
              <button
                onClick={() => setSelected(i)}
                className={`flex w-full gap-3 rounded-lg p-2 text-left ${
                  i === selected ? "bg-page ring-1 ring-line" : "hover:bg-page"
                }`}
              >
                <StatusIcon status={step.status} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {i + 1} · {STEP_LABELS[step.name]}
                  </p>
                  {step.summary && <p className="mt-0.5 text-sm text-muted">{step.summary}</p>}
                </div>
              </button>
              {(comments[step.id] ?? []).map((c) => (
                <div key={c.id} data-testid="comment" className="ml-10 mt-1 mb-2 flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <Avatar name={c.author} color={colorOf(people, c.author)} size="sm" />
                    <div className="min-w-0 text-sm">
                      <p>
                        <span className="font-medium">{c.author}</span>{" "}
                        {c.redirected && <span className="text-xs text-muted">· redirected</span>}
                      </p>
                      <p>{c.text}</p>
                      {c.translation && c.translation !== c.text && (
                        <p className="text-xs text-muted" data-testid="translation">
                          Translated · {c.translation}
                        </p>
                      )}
                    </div>
                  </div>
                  {c.agentReply && (
                    <p data-testid="agent-reply" className="ml-8 rounded-lg bg-page px-2.5 py-1.5 text-xs">
                      <span className="font-medium">Agent</span> · {c.agentReply}
                    </p>
                  )}
                  {c.applied &&
                    (c.notified ? (
                      <p data-testid="notified" className="ml-8 text-xs font-medium text-teal">{c.notified}</p>
                    ) : (
                      <button
                        data-testid="notify"
                        onClick={() => notify(step.id, c.id)}
                        disabled={me !== owner}
                        title={me === owner ? undefined : `Only ${owner}, the plan owner, can send updates`}
                        className="ml-8 w-fit rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Notify {toNotify} team{toNotify === 1 ? "" : "s"}
                      </button>
                    ))}
                </div>
              ))}
            </li>
          ))}
        </ol>
      )}

      {steps.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Comment on step {Math.min(selected, steps.length - 1) + 1}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Add a constraint the agent doesn't know…"
              className="resize-none rounded-lg border border-line px-3 py-2 font-normal outline-none focus:border-blue"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => submit(false)}
              disabled={!text.trim()}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-page disabled:opacity-40"
            >
              Comment
            </button>
            <button
              onClick={() => submit(true)}
              disabled={!text.trim() || agent.disabled}
              className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Comment &amp; redirect
            </button>
          </div>
        </div>
      )}

      {showDebug && (
      <button
        onClick={addTestStep}
        className="mt-5 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-muted hover:bg-page"
      >
        Add test step
      </button>
      )}
    </section>
  );
}

function StatusIcon({ status }: { status: Step["status"] }) {
  const base = "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold";
  if (status === "running")
    return <span aria-label="running" className={`${base} animate-spin border-2 border-blue border-t-transparent`} />;
  if (status === "done")
    return <span aria-label="done" className={`${base} bg-teal text-white`}>✓</span>;
  if (status === "conflict")
    return <span aria-label="conflict" className={`${base} bg-orange text-white`}>!</span>;
  return <span aria-label="pending" className={`${base} border-2 border-line`} />;
}
