"use client";

import { useMutation, useStorage } from "@liveblocks/react/suspense";
import type { Step, StepName } from "@/liveblocks.config";

const STEP_LABELS: Record<StepName, string> = {
  parse: "Parse constraints (LLM)",
  draft: "Draft schedule (solver)",
  validate: "Validate (code)",
  explain: "Explain (LLM)",
};

export function AgentPanel() {
  const steps = useStorage((root) => root.steps);

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

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-semibold">Agent run</h2>
      {steps.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No run yet.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3" data-testid="steps">
          {steps.map((step, i) => (
            <li key={step.id} data-testid="step" className="flex gap-3">
              <StatusIcon status={step.status} />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {i + 1} · {STEP_LABELS[step.name]}
                </p>
                {step.summary && <p className="mt-0.5 text-sm text-muted">{step.summary}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      <button
        onClick={addTestStep}
        className="mt-5 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-muted hover:bg-page"
      >
        Add test step
      </button>
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
