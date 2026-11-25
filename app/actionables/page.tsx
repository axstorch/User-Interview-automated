"use client";

import { useMemo, useState } from "react";
import { allActionables, interviews, ownerOf } from "@/lib/data";
import { download, toCsv } from "@/lib/export";
import { STATUSES } from "@/lib/statuses";
import { ActionableItem } from "@/components/Actionable";
import { useTeam } from "@/components/TeamState";

export default function ActionablesPage() {
  const { state } = useTeam();
  const [status, setStatus] = useState("open");
  const [owner, setOwner] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState("");

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

  const rank = { high: 0, medium: 1, low: 2 } as const;
  const shown = allActionables
    .filter(({ actionable: a }) => {
      const s = state.actionables[a.id];
      if (status && (s?.status ?? "open") !== status) return false;
      if (owner && ownerOf(a, s) !== owner) return false;
      if (area && a.area !== area) return false;
      if (priority && a.priority !== priority) return false;
      return true;
    })
    .sort((x, y) => rank[x.actionable.priority] - rank[y.actionable.priority]);

  const shownInterviews = interviews
    .filter((i) => shown.some((x) => x.interview.id === i.id))
    .map((i) => ({ ...i, actionables: i.actionables.filter((a) => shown.some((x) => x.actionable.id === a.id)) }));

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Actionables</h1>
          <p>Everything interviews told us to do. Each one needs a decision from its owner.</p>
        </div>
        <button className="btn" disabled={!shown.length} onClick={() => download(`actionables-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(shownInterviews, state), "text/csv")}>
          Export CSV
        </button>
      </div>

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
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 12 }}>{shown.length} shown</span>
        </div>
        <div className="card-b">
          {shown.length ? (
            <ul className="list">
              {shown.map(({ interview, actionable }) => (
                <ActionableItem key={actionable.id} interview={interview} a={actionable} showInterview />
              ))}
            </ul>
          ) : (
            <div className="empty">Nothing here. {status === "open" ? "Every actionable has a decision." : ""}</div>
          )}
        </div>
      </section>
    </main>
  );
}
