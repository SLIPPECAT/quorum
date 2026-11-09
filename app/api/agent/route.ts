import { Liveblocks } from "@liveblocks/node";
import type { LiveList, LiveObject } from "@liveblocks/client";
import type { Comment, Constraint, FeedItem, Schedule, Step, StepName, Storage } from "@/liveblocks.config";
import { solve, validate, type SolverInput, type SolverResult } from "@/lib/solver";
import { explainResult, parseNote } from "@/lib/agent/llm";

export const maxDuration = 60;

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  baseUrl: process.env.LIVEBLOCKS_BASE_URL || undefined,
});

/** Storage as plain JSON (LiveList → array, LiveMap → object). */
type StorageJson = {
  setup: Storage["setup"];
  constraints: Constraint[];
  steps: Step[];
  comments: Record<string, Comment[]>;
  steers: string[];
  schedule: Schedule;
  feed: FeedItem[];
};

type Root = LiveObject<Storage>;

type StepOutcome = {
  status: "done" | "conflict";
  summary: string;
  feed: string;
  apply?: (root: Root) => void;
};

const STEPS: StepName[] = ["parse", "draft", "validate", "explain"];

function now() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

function patchStep(root: Root, name: StepName, patch: Partial<Step>) {
  const steps = root.get("steps") as LiveList<Step>;
  const i = steps.findIndex((s) => s.name === name);
  if (i >= 0) steps.set(i, { ...steps.get(i)!, ...patch });
}

function solverInput(s: StorageJson): SolverInput {
  return {
    teams: s.setup.teams,
    rooms: s.setup.rooms,
    judges: s.setup.judges,
    initialPanels: s.setup.initialPanels,
    timing: s.setup.timing,
    constraints: s.constraints.filter((c) => c.kind && c.kind !== "unsupported") as SolverInput["constraints"],
  };
}

function authorsOf(s: StorageJson, ids: string[]) {
  return [...new Set(ids.map((id) => s.constraints.find((c) => c.id === id)?.author).filter(Boolean))] as string[];
}

function scheduleFrom(result: SolverResult, prev: Schedule): Schedule {
  return {
    ...prev,
    slots: result.slots,
    panels: result.panels,
    unplaced: result.unplaced,
    conflictingConstraintIds: result.conflictingConstraintIds,
  };
}

async function runParse(s: StorageJson): Promise<StepOutcome> {
  const notes = s.constraints.filter((c) => c.status === "active" && !c.kind);
  const allComments = Object.values(s.comments ?? {}).flat();
  const steered = s.steers
    .map((id) => allComments.find((c) => c.id === id))
    .filter((c): c is Comment => !!c);

  const [parsedNotes, parsedSteers] = await Promise.all([
    Promise.all(notes.map((n) => parseNote(n.sourceText, s.setup))),
    Promise.all(steered.map((c) => parseNote(c.text, s.setup))),
  ]);

  const total = notes.length + steered.length;
  const unsupported = [...parsedNotes, ...parsedSteers].filter((p) => p.status === "unsupported").length;
  const authors = [...new Set([...notes, ...steered].map((n) => n.author))];

  return {
    status: "done",
    summary: total
      ? `Parsed ${total} note${total === 1 ? "" : "s"} from ${authors.join(", ")} into constraints` +
        (unsupported ? ` (${unsupported} unsupported)` : "")
      : "No new notes to parse",
    feed: `Agent parsed ${total} constraint${total === 1 ? "" : "s"}`,
    apply: (root) => {
      const list = root.get("constraints") as LiveList<Constraint>;
      notes.forEach((note, k) => {
        const i = list.findIndex((c) => c.id === note.id);
        // Author stays from the note's metadata, never from the model.
        if (i >= 0) list.set(i, { ...list.get(i)!, ...clean(parsedNotes[k]) });
      });
      steered.forEach((comment, k) => {
        list.push({
          id: `c-${comment.id}`,
          author: comment.author,
          sourceText: comment.text,
          ...clean(parsedSteers[k]),
        });
      });
      const steers = root.get("steers") as LiveList<string>;
      for (let i = steers.length - 1; i >= 0; i--) {
        if (steered.some((c) => c.id === steers.get(i))) steers.delete(i);
      }
    },
  };
}

/** Liveblocks storage can't hold `undefined` values. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function runDraft(s: StorageJson): StepOutcome {
  const result = solve(solverInput(s));
  const placed = s.setup.teams.length - result.unplaced.length;
  return {
    status: "done",
    summary: `Placed ${placed} of ${s.setup.teams.length} teams across ${s.setup.rooms.length} rooms`,
    feed: `Agent placed ${placed} of ${s.setup.teams.length} teams`,
    apply: (root) => root.set("schedule", scheduleFrom(result, s.schedule)),
  };
}

function runValidate(s: StorageJson): StepOutcome {
  const input = solverInput(s);
  const result = solve(input);
  const violations = validate(input, result);
  const ok = result.ok && violations.length === 0;
  const authors = authorsOf(s, result.conflictingConstraintIds);
  return {
    status: ok ? "done" : "conflict",
    summary: ok
      ? "0 conflicts: every rule holds"
      : `${result.unplaced.length} teams unplaced · conflicting rules from ${authors.join(" and ")}`,
    feed: ok
      ? "Agent drafted a schedule, 0 conflicts"
      : `Agent found a conflict: ${result.unplaced.length} teams don't fit`,
    apply: (root) => root.set("schedule", scheduleFrom(result, s.schedule)),
  };
}

async function runExplain(s: StorageJson): Promise<StepOutcome> {
  const input = solverInput(s);
  const result = solve(input);
  const rules = s.constraints
    .map((c) => `- ${c.author}: "${c.translation ?? c.sourceText}" (${c.kind ?? "unparsed"}, ${c.status})`)
    .join("\n");
  const conflicting = s.constraints
    .filter((c) => result.conflictingConstraintIds.includes(c.id))
    .map((c) => `${c.author}: "${c.translation ?? c.sourceText}"`)
    .join("; ");
  const facts = [
    `Rules:\n${rules}`,
    `Placed ${s.setup.teams.length - result.unplaced.length} of ${s.setup.teams.length} teams, ${s.setup.rooms.length} rooms, ${s.setup.timing.start}–${s.setup.timing.end}, ${s.setup.timing.slotMinutes}-minute slots.`,
    result.unplaced.length
      ? `Unplaced: ${result.unplaced.join(", ")}. Rules that collide: ${conflicting}.`
      : "Every rule holds, 0 conflicts.",
  ].join("\n");
  const text = await explainResult(facts);
  return { status: "done", summary: text, feed: "Agent explained the plan" };
}

export async function POST(req: Request) {
  const { roomId, step } = (await req.json()) as { roomId: string; step: StepName };
  if (!roomId || !STEPS.includes(step)) {
    return Response.json({ error: "roomId and a valid step are required" }, { status: 400 });
  }

  if (step === "parse") {
    await liveblocks.getOrCreateRoom(roomId, { defaultAccesses: ["room:write"] });
  }
  await liveblocks.mutateStorage(roomId, ({ root }) =>
    patchStep(root as unknown as Root, step, { status: "running", summary: "" }),
  );

  try {
    const storage = (await liveblocks.getStorageDocument(roomId, "json")) as unknown as StorageJson;
    const outcome =
      step === "parse"
        ? await runParse(storage)
        : step === "draft"
          ? runDraft(storage)
          : step === "validate"
            ? runValidate(storage)
            : await runExplain(storage);

    await liveblocks.mutateStorage(roomId, ({ root }) => {
      const r = root as unknown as Root;
      outcome.apply?.(r);
      patchStep(r, step, { status: outcome.status, summary: outcome.summary });
      (r.get("feed") as LiveList<FeedItem>).push({ time: now(), actor: "Agent", text: outcome.feed });
    });
    return Response.json({ status: outcome.status });
  } catch (err) {
    console.error(`agent step ${step} failed`, err);
    await liveblocks.mutateStorage(roomId, ({ root }) =>
      patchStep(root as unknown as Root, step, { status: "pending", summary: "Failed, run again" }),
    );
    return Response.json({ error: "step failed" }, { status: 500 });
  }
}
