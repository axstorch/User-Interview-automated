"use client";

import Link from "next/link";
import { useState } from "react";
import { clusterMembers, fmtInterviewDate, NO_OWNER, ownerOf, podOf, routeOf } from "@/lib/data";
import { STATUSES, statusLabel } from "@/lib/statuses";
import type { ActionableStatus, Cluster } from "@/lib/types";
import { type Pending, SourceBadge, StatusDialog } from "./Actionable";
import { IdentityDialog } from "./IdentityDialog";
import { useTeam } from "./TeamState";

const RANK = { high: 0, medium: 1, low: 2 } as const;

/**
 * One ask raised in several interviews. Deciding it here sets the same status on
 * every interview's copy, so each interview page shows the decision too.
 */
export function ClusterItem({ cluster }: { cluster: Cluster }) {
  const { state, me, changeStatus } = useTeam();
  const members = clusterMembers(cluster);
  const statuses = members.map((m) => state.actionables[m.actionable.id]?.status ?? "open");
  const common = statuses.every((s) => s === statuses[0]) ? statuses[0] : null;

  // Owner and priority of the group: the most common route, the highest priority.
  const routes = members.map((m) => routeOf(m.actionable, state.actionables[m.actionable.id]));
  const route = [...new Set(routes)].sort((a, b) => routes.filter((r) => r === b).length - routes.filter((r) => r === a).length)[0];
  const owner = members.map((m) => ownerOf(m.actionable, state.actionables[m.actionable.id]))[routes.indexOf(route)];
  const priority = members.map((m) => m.actionable.priority).sort((a, b) => RANK[a] - RANK[b])[0];
  const fromInterviewer = members.filter((m) => !m.actionable.inferred).length;

  const [pending, setPending] = useState<Pending | null>(null);
  const [needMe, setNeedMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const applyAll = async (extra: { jiraUrl?: string; reason?: string; newOwner?: string }, status: ActionableStatus) => {
    setBusy(true);
    const errors: string[] = [];
    for (const m of members) {
      const s = state.actionables[m.actionable.id];
      const err = await changeStatus(m.actionable.id, { status, by: me, ...extra }, ownerOf(m.actionable, s));
      if (err) errors.push(`${m.interview.interviewee.name}: ${err}`);
    }
    setBusy(false);
    return errors.length ? errors.join(" · ") : null;
  };

  const choose = async (next: ActionableStatus) => {
    setError(null);
    if (!me) return setNeedMe(true);
    const def = STATUSES.find((x) => x.value === next)!;
    if (def.needs) return setPending({ status: next, needs: def.needs });
    setError(await applyAll({}, next));
  };

  return (
    <li className="actionable cluster">
      <div>
        <div className="cluster-tag">Raised in {members.length} interviews</div>
        <div className="text">{cluster.title}</div>
        <div className="meta" style={{ marginTop: 6 }}>
          <SourceBadge inferred={fromInterviewer === 0} />
          {fromInterviewer > 0 && fromInterviewer < members.length && (
            <span className="muted">
              {fromInterviewer} of {members.length} from the interviewer
            </span>
          )}
          <span className={`pill-${priority}`}>● {priority} priority</span>
          <span title={podOf(route).owns}>
            Owner: <b style={{ color: route === NO_OWNER ? "var(--ink-3)" : "var(--ink)" }}>{owner}</b>
          </span>
          <button className="btn ghost small" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Hide the interviews" : "Show the interviews"}
          </button>
        </div>
        {open && (
          <ul className="cluster-members">
            {members.map((m) => {
              const s = state.actionables[m.actionable.id]?.status ?? "open";
              return (
                <li key={m.actionable.id}>
                  <Link href={`/interviews/${encodeURIComponent(m.interview.id)}`}>{m.interview.interviewee.name}</Link>
                  <span className="muted"> · {fmtInterviewDate(m.interview)}</span>
                  {m.actionable.inferred && <span className="muted"> · AI suggestion</span>}
                  {!common && <span className="muted"> · {statusLabel(s)}</span>}
                  <div>{m.actionable.text}</div>
                </li>
              );
            })}
          </ul>
        )}
        {error && <div className="error" style={{ marginTop: 6 }}>{error}</div>}
      </div>
      <div>
        <select
          className="status-select"
          aria-label={`Status for: ${cluster.title}`}
          value={common ?? ""}
          disabled={busy}
          onChange={(e) => e.target.value && choose(e.target.value as ActionableStatus)}
        >
          {!common && <option value="">Mixed — pick one for all</option>}
          {STATUSES.map((x) => (
            <option key={x.value} value={x.value} title={x.hint}>
              {x.label}
            </option>
          ))}
        </select>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Applies to all {members.length}</div>
      </div>

      {needMe && (
        <IdentityDialog reason="Pick your name before changing a status, so the team can see who decided." onClose={() => setNeedMe(false)} />
      )}
      {pending && (
        <StatusDialog
          pending={pending}
          owner={owner}
          route={route}
          onCancel={() => setPending(null)}
          onSave={async (extra) => {
            const err = await applyAll(extra, pending.status);
            if (!err) setPending(null);
            return err;
          }}
        />
      )}
    </li>
  );
}
