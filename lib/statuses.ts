import { isRouteKey, podOf } from "./data";
import type { ActionableState, ActionableStatus, StatusChange } from "./types";

export const STATUSES: {
  value: ActionableStatus;
  label: string;
  hint: string;
  needs?: "jiraUrl" | "reason" | "newOwner";
}[] = [
  { value: "open", label: "Open", hint: "Nobody has decided on this yet" },
  { value: "is_expected", label: "Is expected", hint: "Expected behaviour. No change needed" },
  { value: "jira_created", label: "Jira ticket created", hint: "Work is tracked in Jira", needs: "jiraUrl" },
  { value: "low_priority", label: "Low priority", hint: "Valid, but not now" },
  { value: "will_not_pick_up", label: "Will not pick up", hint: "We won't do this", needs: "reason" },
  {
    value: "mistakenly_assigned",
    label: "Mistakenly assigned",
    hint: "Wrong team. Hand it to the right pod",
    needs: "newOwner",
  },
];

export const statusLabel = (s: ActionableStatus) => STATUSES.find((x) => x.value === s)?.label ?? s;

const MAX = { by: 80, reason: 1000, url: 500, owner: 80 };

/** Returns an error message, or null when the change is valid. */
export function validateChange(c: Partial<StatusChange>): string | null {
  if (!c || typeof c !== "object") return "Missing body";
  if (!STATUSES.some((s) => s.value === c.status)) return "Unknown status";
  const by = (c.by ?? "").trim();
  if (!by || by.length > MAX.by) return "Tell us who you are first";
  if (c.status === "jira_created") {
    const url = (c.jiraUrl ?? "").trim();
    if (!/^https:\/\/\S+$/.test(url) || url.length > MAX.url) return "Paste the Jira ticket link (https://…)";
  }
  if (c.status === "will_not_pick_up") {
    const r = (c.reason ?? "").trim();
    if (r.length < 3) return "Add a reason for not picking this up";
    if (r.length > MAX.reason) return "Reason is too long";
  }
  if (c.status === "mistakenly_assigned") {
    const o = (c.newOwner ?? "").trim();
    if (!o || o.length > MAX.owner || !isRouteKey(o)) return "Pick the team that should own this";
  }
  return null;
}

/**
 * Applies a validated change. "Mistakenly assigned" hands the actionable to the
 * named owner and puts it back to Open, so it lands in their queue; the history
 * keeps the record of who it was wrongly assigned to.
 */
export function applyChange(
  prev: ActionableState | undefined,
  c: StatusChange,
  currentOwner: string,
  now = new Date().toISOString(),
): ActionableState {
  const by = c.by.trim();
  const history = [...(prev?.history ?? [])];

  if (c.status === "mistakenly_assigned") {
    const newOwner = c.newOwner!.trim();
    history.push({ at: now, by, status: "mistakenly_assigned", note: `Reassigned from ${currentOwner} to ${podOf(newOwner).label}` });
    return { status: "open", owner: newOwner, updatedBy: by, updatedAt: now, history };
  }

  const entry = { at: now, by, status: c.status } as ActionableState["history"][number];
  if (c.status === "jira_created") entry.note = c.jiraUrl!.trim();
  if (c.status === "will_not_pick_up") entry.note = c.reason!.trim();
  history.push(entry);

  return {
    status: c.status,
    owner: prev?.owner,
    jiraUrl: c.status === "jira_created" ? c.jiraUrl!.trim() : undefined,
    reason: c.status === "will_not_pick_up" ? c.reason!.trim() : undefined,
    updatedBy: by,
    updatedAt: now,
    history,
  };
}
