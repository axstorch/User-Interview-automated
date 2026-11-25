"use client";

import { ownerOf, slackIdOf } from "@/lib/data";
import type { Interview } from "@/lib/types";
import { useTeam } from "./TeamState";

/**
 * What the bot will post in the interview's thread once it is live. It tags each
 * owner once and lists their actionables. No actionables → no message, only a ✅
 * reaction on the thread so people know it was captured.
 */
export function SlackPreview({ interview }: { interview: Interview }) {
  const { state } = useTeam();
  const byOwner = new Map<string, string[]>();
  for (const a of interview.actionables) {
    const o = ownerOf(a, state.actionables[a.id]);
    byOwner.set(o, [...(byOwner.get(o) ?? []), a.text]);
  }

  return (
    <section className="card">
      <div className="card-h">
        <h2>Slack notification</h2>
        <span className="badge">Preview · not sent</span>
      </div>
      <div className="card-b">
        {interview.actionables.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No actionables, so no message. The bot only adds a ✅ reaction to the thread to show the interview was captured.
          </p>
        ) : (
          <div className="slack">
            <div className="bot">
              <span className="logo-mark" style={{ width: 24, height: 24, fontSize: 13 }}>
                a
              </span>
              <b>Interview Insights</b>
              <span className="app">APP</span>
            </div>
            <div>
              📋 <b>{interview.interviewee.name}</b>&apos;s interview is in Interview Insights with{" "}
              {interview.insights.length} insights and {interview.actionables.length} actionables.
            </div>
            {[...byOwner.entries()].map(([owner, items]) => (
              <div key={owner} style={{ marginTop: 6 }}>
                <span className="mention" title={slackIdOf(owner) ? `Slack ID ${slackIdOf(owner)}` : "No Slack ID yet"}>
                  @{owner}
                </span>{" "}
                for you:
                <ul>
                  {items.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div style={{ color: "var(--info)" }}>Open in Interview Insights →</div>
          </div>
        )}
      </div>
    </section>
  );
}
