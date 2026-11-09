// LLM helpers. The LLM only (1) turns human text into constraints and (2) explains results.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Constraint, Setup } from "@/liveblocks.config";

const MODEL = "claude-opus-5-5";
const client = new Anthropic();

const JUDGES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const ROOMS = ["Room 1", "Room 2", "Room 3", "Room 4"] as const;
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).describe("24-hour HH:MM");
const judge = z.enum(JUDGES);
const room = z.enum(ROOMS);

const ParsedConstraint = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("panel_min_size"),
    size: z.number().int().describe("minimum judges on each panel"),
    room: room.nullable().describe("null = every room"),
    from: time.nullable().describe("null = all day"),
  }),
  z.object({ kind: z.literal("end_by"), time }),
  z.object({ kind: z.literal("judge_unavailable_after"), judge, time }),
  z.object({ kind: z.literal("judge_not_in_room"), judge, room }),
  z.object({
    kind: z.literal("teams_not_concurrent"),
    teams: z.array(z.number().int()).describe("team numbers, e.g. [12, 13]"),
  }),
  z.object({ kind: z.literal("unsupported") }),
]);

const ParseResult = z.object({
  constraint: ParsedConstraint,
  translation: z
    .string()
    .nullable()
    .describe("English translation of the note if it is not in English, else null"),
});

export type ParsedNote = Pick<Constraint, "kind" | "params" | "translation" | "status">;

function systemPrompt(setup: Setup) {
  return [
    "You turn one note from an event organizer into exactly one scheduling constraint for a pitch-judging schedule.",
    `Judges: ${setup.judges.map((j) => `Judge ${j}`).join(", ")}.`,
    `Rooms: ${setup.rooms.join(", ")}.`,
    `Teams: ${setup.teams[0]} to ${setup.teams[setup.teams.length - 1]} (use team numbers).`,
    `Judging runs ${setup.timing.start}–${setup.timing.end} in ${setup.timing.slotMinutes}-minute slots. Times are 24-hour HH:MM; "4 pm" or "4 o'clock" in the afternoon is 16:00.`,
    "One note is usually one constraint. Drop side information that does not fit a field (reasons, flight details, who said it).",
    'If the note fits none of the kinds, return kind "unsupported".',
    "All output is in English.",
  ].join("\n");
}

const isEnglish = (s: string) => /^[\u0000-\u007F\u2013\u2014\u2018-\u201D\u2026\u00B7]*$/.test(s);

/** Parse one note. Author is never taken from the model; the caller keeps it. */
export async function parseNote(text: string, setup: Setup): Promise<ParsedNote> {
  const message = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt(setup),
    messages: [{ role: "user", content: text }],
    output_config: { effort: "low", format: zodOutputFormat(ParseResult) },
  });
  const out = message.parsed_output;
  if (message.stop_reason === "refusal" || !out || out.constraint.kind === "unsupported") {
    return { kind: "unsupported", status: "unsupported", translation: isEnglish(text) ? undefined : (out?.translation ?? undefined) };
  }
  // Translation is only for non-English notes; an English note never gets a "Translated" line.
  const translation = isEnglish(text) ? undefined : (out.translation ?? undefined);
  const c = out.constraint;
  switch (c.kind) {
    case "panel_min_size": {
      const params: Constraint["params"] = { size: c.size };
      if (c.room) params.room = c.room;
      if (c.from) params.from = c.from;
      return { kind: c.kind, params, translation, status: "active" };
    }
    case "end_by":
      return { kind: c.kind, params: { time: c.time }, translation, status: "active" };
    case "judge_unavailable_after":
      return { kind: c.kind, params: { judge: c.judge, time: c.time }, translation, status: "active" };
    case "judge_not_in_room":
      return { kind: c.kind, params: { judge: c.judge, room: c.room }, translation, status: "active" };
    case "teams_not_concurrent": {
      const teams = c.teams
        .map((n) => `Team ${String(n).padStart(2, "0")}`)
        .filter((t) => setup.teams.includes(t));
      if (teams.length < 2) return { kind: "unsupported", status: "unsupported", translation };
      return { kind: c.kind, params: { teams }, translation, status: "active" };
    }
  }
}

/** One or two sentences about the result, naming the people whose rules matter. */
export async function explainResult(facts: string): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system:
      "You explain a judging schedule result to the organizers in at most two short sentences (under 45 words total) of plain English. " +
      "Name the people (authors) whose rules matter, by name only (no pronouns for people). Do not invent facts; use only what is given. No markdown.",
    messages: [{ role: "user", content: facts }],
    output_config: { effort: "low" },
  });
  return message.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join(" ")
    .trim();
}
