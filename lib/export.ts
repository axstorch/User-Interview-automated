import { interviewDate, ownerOf, TYPE_LABEL } from "./data";
import { statusLabel } from "./statuses";
import type { Interview, TeamState } from "./types";

export function fmtDate(iso?: string | null, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function commentsFor(id: string, state: TeamState) {
  return Object.values(state.comments)
    .filter((c) => c.interviewId === id)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function toMarkdown(list: Interview[], state: TeamState): string {
  const out: string[] = [`# User interview insights`, ``, `Exported ${fmtDate(new Date().toISOString(), true)} · ${list.length} interview(s)`, ``];
  for (const i of list) {
    const p = i.interviewee;
    out.push(`---`, ``, `## ${p.name} (${TYPE_LABEL[p.type] ?? p.type}) · ${fmtDate(interviewDate(i))}`, ``);
    const facts = [
      p.from && `From: ${p.from}`,
      p.destination && `Going to: ${p.destination}`,
      p.university && `University: ${p.university}`,
      i.interviewers.length && `Interviewers: ${i.interviewers.join(", ")}`,
      p.leadUrl && `Lead: ${p.leadUrl}`,
      `Slack thread: ${i.slackUrl}`,
    ].filter(Boolean);
    out.push(...facts.map((f) => `- ${f}`), ``);
    if (i.summary) out.push(`**Summary.** ${i.summary}`, ``);
    if (i.insights.length) {
      out.push(`### Insights`, ...i.insights.map((x) => `- ${x.text} _(${x.theme})_`), ``);
    }
    if (i.actionables.length) {
      out.push(`### Actionables`);
      for (const a of i.actionables) {
        const s = state.actionables[a.id];
        const st = statusLabel(s?.status ?? "open");
        const extra = s?.jiraUrl ? ` · ${s.jiraUrl}` : s?.reason ? ` · Reason: ${s.reason}` : "";
        out.push(`- [${st}] ${a.text} — ${a.area}, team ${ownerOf(a, s)}, ${a.priority} priority${extra}`);
      }
      out.push(``);
    }
    if (i.gaps.length) out.push(`### Gaps`, ...i.gaps.map((g) => `- ${g.text}`), ``);
    if (i.openQuestions.length) out.push(`### Open questions`, ...i.openQuestions.map((q) => `- ${q}`), ``);
    const cs = commentsFor(i.id, state);
    if (cs.length) out.push(`### Comments`, ...cs.map((c) => `- **${c.by}** (${fmtDate(c.at, true)}): ${c.text}`), ``);
  }
  return out.join("\n");
}

const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheets from running it as a formula
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per actionable, so it pastes straight into a sheet or a Jira import. */
export function toCsv(list: Interview[], state: TeamState): string {
  const head = [
    "Interview date", "Interviewee", "Type", "Actionable", "Area", "Priority", "Owner team", "Status",
    "Jira link", "Reason", "Last updated by", "Interview link",
  ];
  const rows = list.flatMap((i) =>
    i.actionables.map((a) => {
      const s = state.actionables[a.id];
      return [
        fmtDate(interviewDate(i)), i.interviewee.name, TYPE_LABEL[i.interviewee.type] ?? i.interviewee.type,
        a.text, a.area, a.priority, ownerOf(a, s), statusLabel(s?.status ?? "open"),
        s?.jiraUrl ?? "", s?.reason ?? "", s?.updatedBy ?? "", i.slackUrl,
      ];
    }),
  );
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
