"use client";

import { useEffect, useMemo, useState } from "react";
import { allActionables, clusterOf, findCluster, interviews, ownerOf, snapshotDate, uniqueAskCount } from "@/lib/data";
import { download, toCsv } from "@/lib/export";
import { STATUSES } from "@/lib/statuses";
import type { Actionable, Cluster, Interview } from "@/lib/types";
import { ActionableItem } from "@/components/Actionable";
import { ClusterItem } from "@/components/ClusterItem";
import { useTeam } from "@/components/TeamState";

type Row = { interview: Interview; actionable: Actionable };
type Entry = { kind: "cluster"; cluster: Cluster; rows: Row[] } | { kind: "single"; row: Row };

const RANK = { high: 0, medium: 1, low: 2 } as const;

export default function ActionablesPage() {
  const { state } = useTeam();
  const [status, setStatus] = useState("open");
  const [owner, setOwner] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState("");
  const [source, setSource] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [only, setOnly] = useState<Cluster | null>(null);

  // /actionables?group=<id> (from "See the grouped ask") shows just that group.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("group");
    const c = id ? findCluster(id) : undefined;
    if (c) {
      setOnly(c);
      setStatus("");
    }
  }, []);

  const owners = useMemo(
    () => Array.from(new Set(allActionables.map(({ actionable: a }) => ownerOf(a, state.actionables[a.id])))).sort(),
    [state.actionables],
  );
  const areas = useMemo(() => Array.from(new Set(allActionables.map((x) => x.actionable.area))).sort(), []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const { actionable: a } of allActionables) {
      const s = state.actionables[a.id]?.status ?? "open";
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [state.actionables]);

  const shown = allActionables.filter(({ actionable: a }) => {
    const s = state.actionables[a.id];
    if (only && !only.actionableIds.includes(a.id)) return false;
    if (status && (s?.status ?? "open") !== status) return false;
    if (owner && ownerOf(a, s) !== owner) return false;
    if (area && a.area !== area) return false;
    if (priority && a.priority !== priority) return false;
    if (source === "interviewer" && a.inferred) return false;
    if (source === "ai" && !a.inferred) return false;
    return true;
  });

  // Group what's left: a group shows as one item when 2+ of its members pass the filters.
  const entries: Entry[] = [];
  const byCluster = new Map<string, Row[]>();
  for (const row of shown) {
    const c = grouped ? clusterOf(row.actionable.id) : undefined;
    if (c) byCluster.set(c.id, [...(byCluster.get(c.id) ?? []), row]);
    else entries.push({ kind: "single", row });
  }
  for (const [id, rows] of byCluster) {
    if (rows.length > 1) entries.push({ kind: "cluster", cluster: findCluster(id)!, rows });
    else entries.push({ kind: "single", row: rows[0] });
  }
  const best = (rows: Row[]) => Math.min(...rows.map((r) => RANK[r.actionable.priority]));
  const rowsOf = (e: Entry) => (e.kind === "cluster" ? e.rows : [e.row]);
  // Asks raised in more interviews first, then by priority.
  entries.sort((x, y) => rowsOf(y).length - rowsOf(x).length || best(rowsOf(x)) - best(rowsOf(y)));

  const shownInterviews = interviews
    .filter((i) => shown.some((x) => x.interview.id === i.id))
    .map((i) => ({ ...i, actionables: i.actionables.filter((a) => shown.some((x) => x.actionable.id === a.id)) }));

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Actionables</h1>
          <p>
            Everything interviews told us to do: {allActionables.length} actionables, {uniqueAskCount} different asks once
            repeats are grouped. Each one needs a decision from its owner.
          </p>
          <p className="snapshot">Snapshot of the Slack channel as of {snapshotDate}. Not live.</p>
        </div>
        <button className="btn" disabled={!shown.length} onClick={() => download(`actionables-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(shownInterviews, state), "text/csv")}>
          Export CSV
        </button>
      </div>

      {only && (
        <div className="filter-note">
          Showing one repeated ask: <b>{only.title}</b>
          <button
            className="btn small"
            onClick={() => {
              setOnly(null);
              setStatus("open");
              history.replaceState(null, "", "/actionables");
            }}
          >
            Show all
          </button>
        </div>
      )}

      <section className="card">
        <div className="toolbar">
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status ({allActionables.length})</option>
            {STATUSES.filter((s) => s.value !== "mistakenly_assigned").map((s) => (
              <option key={s.value} value={s.value}>{s.label} ({counts[s.value] ?? 0})</option>
            ))}
          </select>
          <select className="select" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner">
            <option value="">Every team</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="select" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Who suggested it">
            <option value="">Interviewer and AI</option>
            <option value="interviewer">From the interviewer only</option>
            <option value="ai">AI suggestions only</option>
          </select>
          <select className="select" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
            <option value="">All areas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
            <option value="">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="check">
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} /> Group repeated asks
          </label>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 12 }}>{entries.length} shown</span>
        </div>
        <div className="card-b">
          {entries.length ? (
            <ul className="list">
              {entries.map((e) =>
                e.kind === "cluster" ? (
                  <ClusterItem key={e.cluster.id} cluster={e.cluster} />
                ) : (
                  <ActionableItem key={e.row.actionable.id} interview={e.row.interview} a={e.row.actionable} showInterview />
                ),
              )}
            </ul>
          ) : (
            <div className="empty">Nothing here. {status === "open" ? "Every actionable has a decision." : ""}</div>
          )}
        </div>
      </section>
    </main>
  );
}
