import type { WorkspaceRule } from "./types";

const SEOUL = "Seoul judging · Nov 9";
const TOKYO = "Tokyo judging · Mar 2027";
const REHEARSAL = "All-hands rehearsal · Nov 14";

// Seeded demo data for the rule map. Every rule is tagged `demo: true`.
// `usedBy` entries with live: false are previews of the next templates, not running plans.
export const demoRules: WorkspaceRule[] = [
  {
    id: "rule-panel-2",
    text: "Every room needs a 2-judge panel",
    subjects: [{ type: "org", name: "c0mpiled Ops" }],
    owner: "Ji-won",
    scope: "All events",
    status: "active",
    source: {
      quote: "No room should be judged by one person. Two judges, always.",
      author: "Ji-won",
      date: "2026-02-14",
      plan: "Tokyo judging · Mar 2026",
    },
    usedBy: [
      { plan: SEOUL, live: true },
      { plan: TOKYO, live: false },
      { plan: REHEARSAL, live: false },
    ],
    history: [
      { date: "2026-02-14", actor: "Ji-won", text: "Created from a comment in the Tokyo planning session" },
      {
        date: "2026-03-21",
        actor: "Ji-won",
        text: "2026-03 Tokyo: Ji-won allowed a solo judge after a judge left",
      },
      { date: "2026-06-02", actor: "Ji-won", text: "Allowed a solo judge for the last slot at the Busan meetup" },
    ],
    demo: true,
  },
  {
    id: "rule-room4",
    text: "Room 4 is upstairs — Judge C can't use it",
    subjects: [
      { type: "place", name: "Room 4" },
      { type: "person", name: "Judge C" },
    ],
    owner: "Alex",
    scope: "Always",
    status: "active",
    source: {
      quote: "Room 4 is on the second floor, and Judge C can't take the stairs.",
      author: "Alex",
      date: "2026-11-05",
      plan: SEOUL,
    },
    usedBy: [
      { plan: SEOUL, live: true },
      { plan: "Room booking", live: false },
    ],
    history: [{ date: "2026-11-05", actor: "Agent", text: "Captured from Alex's message and confirmed by Alex" }],
    demo: true,
  },
  {
    id: "rule-end-1700",
    text: "Judging ends by 17:00",
    subjects: [{ type: "plan", name: SEOUL }],
    owner: "Alex",
    scope: "This plan",
    status: "active",
    source: {
      quote: "The venue closes the judging floor at 17:00. Nothing can run past that.",
      author: "Alex",
      date: "2026-11-08",
      plan: SEOUL,
    },
    usedBy: [{ plan: SEOUL, live: true }],
    history: [
      { date: "2026-11-08", actor: "Agent", text: "Captured from Alex's message" },
      { date: "2026-11-09", actor: "Alex", text: "Confirmed" },
    ],
    demo: true,
  },
  {
    id: "rule-judge-b-1600",
    text: "Judge B has to leave at 16:00",
    subjects: [{ type: "person", name: "Judge B" }],
    owner: "Min",
    scope: "Today only?",
    status: "proposed",
    source: {
      quote: "Judge B has a 4 pm flight, so they need to leave early",
      author: "Min",
      date: "2026-11-09",
      plan: SEOUL,
    },
    usedBy: [{ plan: SEOUL, live: true }],
    history: [{ date: "2026-11-09", actor: "Agent", text: "Proposed from Min's comment. Waiting for Min to confirm" }],
    demo: true,
  },
  {
    id: "rule-tokyo-venue",
    text: "Tokyo venue closes at 21:00",
    subjects: [{ type: "place", name: "Tokyo venue" }],
    owner: "Ji-won",
    scope: "Tokyo · Mar 2026",
    status: "retire_suggested",
    source: {
      quote: "The Tokyo venue shuts at nine, so the party can't run late.",
      author: "Ji-won",
      date: "2026-02-20",
      plan: "Tokyo judging · Mar 2026",
    },
    usedBy: [],
    history: [
      { date: "2026-02-20", actor: "Ji-won", text: "Created for the Tokyo event" },
      { date: "2026-11-09", actor: "Agent", text: "Suggested retiring: the event it covered ended on 2026-03-22" },
    ],
    demo: true,
  },
  {
    id: "rule-mentor-concurrent",
    text: "Teams that share a mentor can't present at the same time",
    subjects: [{ type: "person", name: "Mentors" }],
    owner: "Min",
    scope: "All events",
    status: "active",
    source: {
      quote: "If two teams have the same mentor, don't put them in the same slot.",
      author: "Min",
      date: "2026-10-12",
      plan: "Seoul planning kickoff",
    },
    usedBy: [
      { plan: SEOUL, live: true },
      { plan: REHEARSAL, live: false },
    ],
    history: [{ date: "2026-10-12", actor: "Min", text: "Created" }],
    demo: true,
  },
  {
    id: "rule-mentor-one-room",
    text: "A mentor can't be in two rooms at once",
    subjects: [{ type: "person", name: "Mentors" }],
    owner: "Alex",
    scope: "All events",
    status: "active",
    source: {
      quote: "Mentors walk between rooms, so never book one in two places at the same time.",
      author: "Alex",
      date: "2026-10-20",
      plan: "Seoul planning kickoff",
    },
    usedBy: [{ plan: TOKYO, live: false }],
    history: [{ date: "2026-10-20", actor: "Alex", text: "Created" }],
    demo: true,
  },
  {
    id: "rule-judge-d-mornings",
    text: "Judge D prefers morning slots",
    subjects: [{ type: "person", name: "Judge D" }],
    owner: "Min",
    scope: "Always",
    status: "active",
    source: {
      quote: "D is much sharper in the morning if you can.",
      author: "Min",
      date: "2026-04-18",
      plan: "Busan meetup",
    },
    usedBy: [],
    history: [{ date: "2026-04-18", actor: "Min", text: "Created" }],
    demo: true,
  },
];

/** Rule pairs the agent flags as saying nearly the same thing (demo data). */
export const demoSimilarPairs: [string, string][] = [["rule-mentor-concurrent", "rule-mentor-one-room"]];
