"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { INTERVIEW_STATUS_LABEL, interviewDate, interviews, TYPE_LABEL } from "@/lib/data";
import { download, fmtDate, toCsv, toMarkdown } from "@/lib/export";
import { useTeam } from "@/components/TeamState";

const ALL = "";

export default function InterviewsPage() {
  const router = useRouter();
  const { state } = useTeam();
  const [q, setQ] = useState("");
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [theme, setTheme] = useState(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const themes = useMemo(() => Array.from(new Set(interviews.flatMap((i) => i.themes))).sort(), []);
  const types = useMemo(() => Array.from(new Set(interviews.map((i) => i.interviewee.type))), []);

  const openCount = (id: string) =>
    interviews.find((i) => i.id === id)!.actionables.filter((a) => (state.actionables[a.id]?.status ?? "open") === "open").length;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return interviews.filter((i) => {
      if (type && i.interviewee.type !== type) return false;
      if (status && i.status !== status) return false;
      if (theme && !i.themes.includes(theme)) return false;
      if (!needle) return true;
      const hay = [
        i.interviewee.name, i.interviewee.from, i.interviewee.destination, i.interviewee.university, i.summary,
        ...i.interviewers, ...i.insights.map((x) => x.text), ...i.actionables.map((x) => x.text), ...i.gaps.map((x) => x.text),
      ].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [q, type, status, theme]);

  const totals = useMemo(() => {
    const acts = interviews.flatMap((i) => i.actionables);
    return {
      interviews: interviews.length,
      insights: interviews.reduce((n, i) => n + i.insights.length, 0),
      open: acts.filter((a) => (state.actionables[a.id]?.status ?? "open") === "open").length,
      actionables: acts.length,
      awaiting: interviews.filter((i) => i.status === "awaiting_insights").length,
    };
  }, [state.actionables]);

  const exportList = selected.size ? interviews.filter((i) => selected.has(i.id)) : shown;
  const allShownSelected = shown.length > 0 && shown.every((i) => selected.has(i.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>User interviews</h1>
          <p>Every interview from #product-user-interviews, with what we learned and what we should do about it.</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><b>{totals.interviews}</b><span>Interviews</span></div>
        <div className="stat"><b>{totals.insights}</b><span>Insights</span></div>
        <Link href="/actionables" className="stat accent" style={{ textDecoration: "none" }}>
          <b>{totals.open}<span style={{ fontSize: 14, color: "var(--ink-3)" }}> / {totals.actionables}</span></b>
          <span>Actionables still open →</span>
        </Link>
        <div className="stat"><b>{totals.awaiting}</b><span>Awaiting insights</span></div>
      </div>

      <section className="card">
        <div className="toolbar">
          <input className="input" type="search" placeholder="Search names, insights, actionables…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Interviewee type">
            <option value="">All people</option>
            {types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {Object.entries(INTERVIEW_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Theme">
            <option value="">All themes</option>
            {themes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 12 }}>
            {selected.size ? `${selected.size} selected` : `Export all ${shown.length} shown`}
          </span>
          <button className="btn" disabled={!exportList.length} onClick={() => download(`interview-insights-${stamp}.md`, toMarkdown(exportList, state), "text/markdown")}>
            Export Markdown
          </button>
          <button className="btn" disabled={!exportList.length} onClick={() => download(`interview-actionables-${stamp}.csv`, toCsv(exportList, state), "text/csv")}>
            Export CSV
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    aria-label="Select all shown"
                    checked={allShownSelected}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        shown.forEach((i) => (allShownSelected ? n.delete(i.id) : n.add(i.id)));
                        return n;
                      })
                    }
                  />
                </th>
                <th>Interviewee</th>
                <th>Date</th>
                <th className="hide-sm">Interviewed by</th>
                <th className="hide-sm">Insights</th>
                <th>Open actionables</th>
                <th className="hide-sm">Themes</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => {
                const p = i.interviewee;
                const where = [p.from, p.destination].filter(Boolean).join(" → ");
                const open = openCount(i.id);
                const href = `/interviews/${encodeURIComponent(i.id)}`;
                return (
                  <tr key={i.id} onClick={() => router.push(href)}>
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                    </td>
                    <td>
                      <Link className="name" href={href} onClick={(e) => e.stopPropagation()}>{p.name}</Link>
                      <div className="sub">
                        {TYPE_LABEL[p.type] ?? p.type}
                        {where ? ` · ${where}` : ""}
                      </div>
                      {i.status !== "insights_posted" && (
                        <span className={`badge ${i.status === "cancelled" ? "" : "warn"}`} style={{ marginTop: 4 }}>
                          {INTERVIEW_STATUS_LABEL[i.status]}
                        </span>
                      )}
                    </td>
                    <td className="num">{fmtDate(interviewDate(i))}</td>
                    <td className="hide-sm">{i.interviewers.join(", ") || "—"}</td>
                    <td className="num hide-sm">{i.insights.length}</td>
                    <td className="num">
                      {i.actionables.length ? (
                        <span className={`badge ${open ? "brand" : "ok"}`}>
                          {open ? `${open} open` : "All decided"} · {i.actionables.length}
                        </span>
                      ) : (
                        <span className="muted">None</span>
                      )}
                    </td>
                    <td className="hide-sm">
                      <div className="badges">
                        {i.themes.slice(0, 3).map((t) => <span key={t} className="badge">{t}</span>)}
                        {i.themes.length > 3 && <span className="badge">+{i.themes.length - 3}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && <div className="empty">No interviews match these filters.</div>}
        </div>
      </section>
    </main>
  );
}
