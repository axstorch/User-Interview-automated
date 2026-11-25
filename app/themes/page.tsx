"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { interviews } from "@/lib/data";

export default function ThemesPage() {
  const [openTheme, setOpenTheme] = useState<string | null>(null);

  const themes = useMemo(() => {
    const m = new Map<string, { interviews: Set<string>; insights: { text: string; interviewId: string; who: string }[] }>();
    for (const i of interviews) {
      for (const x of i.insights) {
        const t = m.get(x.theme) ?? { interviews: new Set(), insights: [] };
        t.interviews.add(i.id);
        t.insights.push({ text: x.text, interviewId: i.id, who: i.interviewee.name });
        m.set(x.theme, t);
      }
    }
    return [...m.entries()].map(([name, v]) => ({ name, count: v.interviews.size, insights: v.insights })).sort((a, b) => b.count - a.count);
  }, []);

  const withInsights = interviews.filter((i) => i.insights.length).length || 1;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Themes</h1>
          <p>
            What keeps coming up across interviews. The bar shows how many of the {withInsights} interviews with insights
            touched each theme. Click a theme to read them.
          </p>
        </div>
      </div>

      <section className="card">
        <div className="card-b">
          {themes.map((t) => (
            <div key={t.name} id={encodeURIComponent(t.name)}>
              <div className="theme-row" onClick={() => setOpenTheme(openTheme === t.name ? null : t.name)} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setOpenTheme(openTheme === t.name ? null : t.name)} aria-expanded={openTheme === t.name}>
                <b>{t.name}</b>
                <div className="bar" aria-hidden><i style={{ width: `${(t.count / withInsights) * 100}%` }} /></div>
                <span className="num" style={{ textAlign: "right" }}>{t.count}</span>
              </div>
              {openTheme === t.name && (
                <ul className="bullets" style={{ margin: "4px 0 14px" }}>
                  {t.insights.map((x, k) => (
                    <li key={k}>
                      {x.text}{" "}
                      <Link className="src" href={`/interviews/${encodeURIComponent(x.interviewId)}`}>— {x.who}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {themes.length === 0 && <div className="empty">No insights yet.</div>}
        </div>
      </section>
    </main>
  );
}
