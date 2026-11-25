"use client";

import Link from "next/link";
import { findInterview, INTERVIEW_STATUS_LABEL, interviewDate, slackMessageUrl, TYPE_LABEL } from "@/lib/data";
import { download, fmtDate, toCsv, toMarkdown } from "@/lib/export";
import { ActionableItem } from "./Actionable";
import { Comments } from "./Comments";
import { SlackPreview } from "./SlackPreview";
import { useTeam } from "./TeamState";

function Src({ ts, thread }: { ts?: string | null; thread: string }) {
  const href = slackMessageUrl(ts, thread);
  return href ? (
    <a className="src" href={href} target="_blank" rel="noreferrer" title="Open the Slack message this came from">
      Source ↗
    </a>
  ) : null;
}

export function InterviewDetail({ id }: { id: string }) {
  const i = findInterview(id)!;
  const { state } = useTeam();
  const p = i.interviewee;
  const open = i.actionables.filter((a) => (state.actionables[a.id]?.status ?? "open") === "open").length;
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const facts: [string, React.ReactNode][] = [
    ["Interview date", fmtDate(interviewDate(i), true)],
    ["Interviewed by", i.interviewers.join(", ") || "—"],
    ["Insights posted by", i.insightsPostedBy?.join(", ") || "—"],
    ["From", p.from || "—"],
    ["Going to", p.destination || "—"],
    ["University", p.university || "—"],
    ["Booked with Amber", p.bookedWithAmber == null ? "—" : p.bookedWithAmber ? "Yes" : "No"],
  ];

  return (
    <main className="page">
      <Link href="/" className="back">← All interviews</Link>
      <div className="page-head">
        <div>
          <h1>{p.name}</h1>
          <p>
            {TYPE_LABEL[p.type] ?? p.type} · {fmtDate(interviewDate(i))} ·{" "}
            <span className={i.status === "insights_posted" ? "" : "pill-medium"}>{INTERVIEW_STATUS_LABEL[i.status]}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {p.leadUrl && <a className="btn" href={p.leadUrl} target="_blank" rel="noreferrer">Lead in CRM ↗</a>}
          <a className="btn" href={i.slackUrl} target="_blank" rel="noreferrer">Slack thread ↗</a>
          <button className="btn" onClick={() => download(`interview-${slug}.md`, toMarkdown([i], state), "text/markdown")}>Export</button>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <section className="card">
            <div className="card-b">
              <p className="summary">{i.summary || "No summary yet."}</p>
              {i.themes.length > 0 && (
                <div className="badges" style={{ marginTop: 12 }}>
                  {i.themes.map((t) => (
                    <Link key={t} href={`/themes#${encodeURIComponent(t)}`} className="badge brand" style={{ textDecoration: "none" }}>
                      {t}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="card" style={{ borderColor: "var(--brand-line)" }}>
            <div className="card-h" style={{ background: "var(--brand-soft)", borderBottomColor: "var(--brand-line)", borderRadius: "10px 10px 0 0" }}>
              <h2>Actionables <span className="count">{i.actionables.length}</span></h2>
              {i.actionables.length > 0 && <span className={`badge ${open ? "brand" : "ok"}`}>{open ? `${open} open` : "All decided"}</span>}
              <span className="spacer" />
              {i.actionables.length > 0 && (
                <button className="btn small" onClick={() => download(`actionables-${slug}.csv`, toCsv([i], state), "text/csv")}>CSV</button>
              )}
            </div>
            <div className="card-b">
              {i.actionables.length ? (
                <ul className="list">{i.actionables.map((a) => <ActionableItem key={a.id} interview={i} a={a} />)}</ul>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  {i.status === "awaiting_insights" ? "No insights posted in Slack yet, so nothing to act on." : "No actionables came out of this interview."}
                </p>
              )}
            </div>
          </section>

          {i.insights.length > 0 && (
            <section className="card">
              <div className="card-h"><h2>Key insights <span className="count">{i.insights.length}</span></h2></div>
              <div className="card-b">
                <ul className="list">
                  {i.insights.map((x) => (
                    <li key={x.id}>
                      <div>{x.text}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center" }}>
                        <span className="badge">{x.theme}</span>
                        <Src ts={x.sourceTs} thread={i.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {i.gaps.length > 0 && (
            <section className="card">
              <div className="card-h"><h2>Gaps &amp; pain points <span className="count">{i.gaps.length}</span></h2></div>
              <div className="card-b">
                <ul className="list">
                  {i.gaps.map((g) => (
                    <li key={g.id} className="gap-item">
                      <div>
                        <div>{g.text}</div>
                        <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center" }}>
                          {g.area && <span className="badge">{g.area}</span>}
                          <Src ts={g.sourceTs} thread={i.id} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {i.sections.length > 0 && (
            <section className="card">
              <div className="card-h"><h2>Interview notes</h2><span className="muted" style={{ fontSize: 12 }}>by topic</span></div>
              <div className="card-b">
                {i.sections.map((s) => (
                  <div key={s.title}>
                    <div className="section-title">{s.title}</div>
                    <ul className="bullets">
                      {s.points.map((pt, k) => (
                        <li key={k}>
                          {pt.text} <Src ts={pt.sourceTs} thread={i.id} />
                          {pt.quote && <blockquote className="quote">“{pt.quote}”</blockquote>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {i.openQuestions.length > 0 && (
            <section className="card">
              <div className="card-h"><h2>Ask next time</h2></div>
              <div className="card-b">
                <ul className="bullets">{i.openQuestions.map((q, k) => <li key={k}>{q}</li>)}</ul>
              </div>
            </section>
          )}

          <div style={{ marginTop: 16 }}>
            <Comments interviewId={i.id} />
          </div>
        </div>

        <aside>
          <section className="card">
            <div className="card-h"><h2>Details</h2></div>
            <div className="card-b">
              <dl className="facts" style={{ margin: 0 }}>
                {facts.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
                {i.meetLink && <div><dt>Meet link</dt><dd><a href={i.meetLink} target="_blank" rel="noreferrer">Open ↗</a></dd></div>}
                {i.recordingUrl && <div><dt>Recording</dt><dd><a href={i.recordingUrl} target="_blank" rel="noreferrer">Watch ↗</a></dd></div>}
              </dl>
            </div>
          </section>

          {i.context.length > 0 && (
            <section className="card">
              <div className="card-h"><h2>Pre-call context</h2></div>
              <div className="card-b">
                <ul className="bullets" style={{ fontSize: 13 }}>{i.context.map((c, k) => <li key={k}>{c}</li>)}</ul>
              </div>
            </section>
          )}

          <SlackPreview interview={i} />
        </aside>
      </div>
    </main>
  );
}
