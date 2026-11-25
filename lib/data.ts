import raw from "@/data/interviews.json";
import routingRaw from "@/data/routing.json";
import type { Actionable, ActionableState, Cluster, Dataset, Interview } from "./types";

export const dataset = raw as unknown as Dataset;

// Pods and Slack groups are Felix's (amberhq/fix-it-felix ROUTE_GROUP_MAP).
export type Pod = { label: string; slackGroupId?: string; owns: string };
const routing = routingRaw as unknown as { pods: Record<string, Pod>; none: Pod };
export const PODS: Record<string, Pod> = routing.pods;
export const NO_OWNER = "none";
export const ROUTE_KEYS = [...Object.keys(PODS), NO_OWNER];
export const isRouteKey = (k: string) => ROUTE_KEYS.includes(k);

export const interviews: Interview[] = [...dataset.interviews].sort((a, b) =>
  interviewDate(b).localeCompare(interviewDate(a)),
);

export function interviewDate(i: Interview): string {
  return i.scheduledFor || i.insightsPostedAt || i.postedAt;
}

export function findInterview(id: string): Interview | undefined {
  return interviews.find((i) => i.id === id);
}

export function podOf(key: string): Pod {
  return PODS[key] ?? routing.none;
}

/** The route of an actionable: a reassignment wins over the AI's routing. */
export function routeOf(a: Actionable, state?: ActionableState): string {
  if (state?.owner) return state.owner; // a pod key, or a person's name saved before pod routing
  return a.route && isRouteKey(a.route) ? a.route : NO_OWNER;
}

/** Display name of whoever owns an actionable. */
export function ownerOf(a: Actionable, state?: ActionableState): string {
  const r = routeOf(a, state);
  return isRouteKey(r) ? podOf(r).label : r;
}

/** People seen in the channel, offered when someone picks their own name. */
export const knownPeople: string[] = Array.from(new Set(Object.values(dataset.people ?? {}).map((p) => p.name)))
  .filter((n) => n && !/notion|bot/i.test(n))
  .sort((a, b) => a.localeCompare(b));

export const allActionables = interviews.flatMap((i) => i.actionables.map((a) => ({ interview: i, actionable: a })));

export const actionableIds = new Set(allActionables.map((x) => x.actionable.id));

// ---- Repeated asks: the same actionable raised in several interviews ----
export const clusters: Cluster[] = dataset.clusters ?? [];
const clusterByActionable = new Map(clusters.flatMap((c) => c.actionableIds.map((id) => [id, c] as const)));
const actionableById = new Map(allActionables.map((x) => [x.actionable.id, x]));

export const clusterOf = (actionableId: string): Cluster | undefined => clusterByActionable.get(actionableId);
export const findCluster = (id: string) => clusters.find((c) => c.id === id);
export const clusterMembers = (c: Cluster) => c.actionableIds.map((id) => actionableById.get(id)!).filter(Boolean);

/** Actionables counted once per group. */
export const uniqueAskCount = allActionables.length - clusters.reduce((n, c) => n + c.actionableIds.length - 1, 0);

export const fmtInterviewDate = (i: Interview) =>
  new Date(interviewDate(i)).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

/** "25 Nov 2026": when the interviews were last read from Slack. */
export const snapshotDate = new Date(dataset.generatedAt).toLocaleDateString("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});
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
