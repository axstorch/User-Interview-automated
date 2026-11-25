import raw from "@/data/interviews.json";
import ownersRaw from "@/data/owners.json";
import type { Actionable, ActionableState, Dataset, Interview } from "./types";

export const dataset = raw as unknown as Dataset;

const owners = ownersRaw as {
  areas: Record<string, { owner: string; slackId?: string }>;
  fallback: { owner: string; slackId?: string };
};

export const interviews: Interview[] = [...dataset.interviews].sort((a, b) =>
  interviewDate(b).localeCompare(interviewDate(a)),
);

export function interviewDate(i: Interview): string {
  return i.scheduledFor || i.insightsPostedAt || i.postedAt;
}

export function findInterview(id: string): Interview | undefined {
  return interviews.find((i) => i.id === id);
}

export function suggestedOwner(area: string): { owner: string; slackId?: string } {
  return owners.areas[area] ?? owners.fallback;
}

/** The owner shown on an actionable: a reassignment wins over the area's default. */
export function ownerOf(a: Actionable, state?: ActionableState): string {
  return state?.owner || suggestedOwner(a.area).owner;
}

export function slackIdOf(name: string): string | undefined {
  const fromOwners = Object.values(owners.areas).find((o) => o.owner === name)?.slackId;
  if (fromOwners) return fromOwners;
  return Object.entries(dataset.people ?? {}).find(([, p]) => p.name === name)?.[0];
}

/** Everyone we know by name: area owners plus people seen in the channel. */
export const knownPeople: string[] = Array.from(
  new Set([
    ...Object.values(owners.areas).map((o) => o.owner),
    ...Object.values(dataset.people ?? {}).map((p) => p.name),
  ]),
)
  .filter((n) => n && !/notion|bot/i.test(n))
  .sort((a, b) => a.localeCompare(b));

export const allActionables = interviews.flatMap((i) => i.actionables.map((a) => ({ interview: i, actionable: a })));

export const actionableIds = new Set(allActionables.map((x) => x.actionable.id));
export const interviewIds = new Set(interviews.map((i) => i.id));

export function slackMessageUrl(ts?: string | null, threadTs?: string): string | undefined {
  if (!ts) return undefined;
  const base = `https://slack.com/archives/${dataset.channel.id}/p${ts.replace(".", "")}`;
  return threadTs && threadTs !== ts ? `${base}?thread_ts=${threadTs}&cid=${dataset.channel.id}` : base;
}

export const TYPE_LABEL: Record<string, string> = {
  student: "Student",
  parent: "Parent",
  partner: "Partner",
  agent: "Agent",
  internal: "Internal team",
  non_user_student: "Non-Amber student",
  synthesis: "Synthesis",
};

export const INTERVIEW_STATUS_LABEL: Record<string, string> = {
  insights_posted: "Insights posted",
  awaiting_insights: "Awaiting insights",
  cancelled: "Cancelled",
};
