"use client";

import { isRouteKey, NO_OWNER, podOf, routeOf } from "@/lib/data";
import type { Interview } from "@/lib/types";
import { useTeam } from "./TeamState";

/**
 * What the bot will post in the interview's thread once it is live. Like Felix,
 * it tags each pod's Slack group once (<!subteam^ID>) and lists that pod's
 * actionables; items with no tech owner are listed but tag nobody. No actionables →
 * no message, only a ✅ reaction on the thread so people know it was captured.
 */
export function SlackPreview({ interview }: { interview: Interview }) {
  const { state } = useTeam();
  const byRoute = new Map<string, { text: string; inferred: boolean }[]>();
  for (const a of interview.actionables) {
    const r = routeOf(a, state.actionables[a.id]);
    byRoute.set(r, [...(byRoute.get(r) ?? []), { text: a.text, inferred: !!a.inferred }]);
  }
  const groups = [...byRoute.entries()].sort(([a], [b]) => Number(a === NO_OWNER) - Number(b === NO_OWNER));

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
            {groups.map(([route, items]) => {
              const pod = podOf(route);
              const tagged = route !== NO_OWNER && isRouteKey(route);
              return (
                <div key={route} style={{ marginTop: 6 }}>
                  {tagged ? (
                    <>
                      <span className="mention" title={pod.slackGroupId ? `Slack group ${pod.slackGroupId}` : ""}>
                        @{pod.label}
                      </span>{" "}
                      for you:
                    </>
                  ) : isRouteKey(route) ? (
                    <span className="muted">No tech owner, nobody tagged:</span>
                  ) : (
                    <>
                      <span className="mention">@{route}</span> for you:
                    </>
                  )}
                  <ul>
                    {items.map((t, i) => (
                      <li key={i}>{t.text}{t.inferred && <i className="muted"> (AI suggestion)</i>}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <div style={{ color: "var(--info)" }}>Open in Interview Insights →</div>
          </div>
        )}
      </div>
    </section>
  );
}
