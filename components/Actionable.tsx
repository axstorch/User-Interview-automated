"use client";

import Link from "next/link";
import { useState } from "react";
import { knownPeople, ownerOf, slackMessageUrl } from "@/lib/data";
import { fmtDate } from "@/lib/export";
import { STATUSES, statusLabel } from "@/lib/statuses";
import type { Actionable as A, ActionableStatus, Interview } from "@/lib/types";
import { IdentityDialog } from "./IdentityDialog";
import { useTeam } from "./TeamState";

const TONE: Record<ActionableStatus, string> = {
  open: "brand",
  is_expected: "ok",
  jira_created: "info",
  low_priority: "",
  will_not_pick_up: "bad",
  mistakenly_assigned: "warn",
};

export function StatusBadge({ status }: { status: ActionableStatus }) {
  return <span className={`badge ${TONE[status]}`}>{statusLabel(status)}</span>;
}

type Pending = { status: ActionableStatus; needs: "jiraUrl" | "reason" | "newOwner" };

export function ActionableItem({ interview, a, showInterview = false }: { interview: Interview; a: A; showInterview?: boolean }) {
  const { state, me, changeStatus } = useTeam();
  const s = state.actionables[a.id];
  const status = s?.status ?? "open";
  const owner = ownerOf(a, s);
  const [pending, setPending] = useState<Pending | null>(null);
  const [needMe, setNeedMe] = useState<ActionableStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const choose = async (next: ActionableStatus) => {
    setError(null);
    if (next === status && next !== "mistakenly_assigned") return;
    if (!me) return setNeedMe(next);
    const def = STATUSES.find((x) => x.value === next)!;
    if (def.needs) return setPending({ status: next, needs: def.needs });
    setBusy(true);
    setError(await changeStatus(a.id, { status: next, by: me }, owner));
    setBusy(false);
  };

  const src = slackMessageUrl(a.sourceTs, interview.id);

  return (
    <li className="actionable">
      <div>
        {showInterview && (
          <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>
            <Link href={`/interviews/${encodeURIComponent(interview.id)}`}>{interview.interviewee.name}</Link> ·{" "}
            {fmtDate(interview.scheduledFor || interview.postedAt)}
          </div>
        )}
        <div className="text">{a.text}</div>
        {a.rationale && <div className="why">{a.rationale}</div>}
        <div className="meta" style={{ marginTop: 6 }}>
          <span className="badge">{a.area}</span>
          <span className={`pill-${a.priority}`}>● {a.priority} priority</span>
          <span>
            Owner: <b style={{ color: "var(--ink)" }}>{owner}</b>
            {!s?.owner && <span title="Suggested from the area. Not confirmed"> (suggested)</span>}
          </span>
          {a.inferred && <span title="The interviewer didn't say this outright; the AI drew it from the insight">AI-inferred</span>}
          {src && (
            <a className="src" href={src} target="_blank" rel="noreferrer">
              Source ↗
            </a>
          )}
        </div>
      </div>
      <div>
        <label className="sr-only" htmlFor={`st-${a.id}`} style={{ position: "absolute", left: -9999 }}>
          Status
        </label>
        <select
          id={`st-${a.id}`}
          className="status-select"
          value={status}
          disabled={busy}
          onChange={(e) => choose(e.target.value as ActionableStatus)}
        >
          {STATUSES.map((x) => (
            <option key={x.value} value={x.value} title={x.hint}>
              {x.label}
            </option>
          ))}
        </select>
      </div>

      {(s?.jiraUrl || s?.reason || s?.history?.length || error) && (
        <div className="resolution">
          {s?.jiraUrl && (
            <div>
              Jira:{" "}
              <a href={s.jiraUrl} target="_blank" rel="noreferrer">
                {s.jiraUrl}
              </a>
            </div>
          )}
          {s?.reason && <div>Reason: {s.reason}</div>}
          {s?.history?.length ? (
            <div className="muted" style={{ fontSize: 12 }}>
              {statusLabel(status)} · {s.updatedBy}, {fmtDate(s.updatedAt, true)}{" "}
              <button className="btn ghost small" onClick={() => setShowHistory((v) => !v)}>
                {showHistory ? "Hide history" : `History (${s.history.length})`}
              </button>
              {showHistory && (
                <ul className="history">
                  {[...s.history].reverse().map((h, i) => (
                    <li key={i}>
                      {fmtDate(h.at, true)} · {h.by} → {statusLabel(h.status)}
                      {h.note ? ` · ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          {error && <div className="error">{error}</div>}
        </div>
      )}

      {needMe && (
        <IdentityDialog
          reason="Pick your name before changing a status, so the team can see who decided."
          onClose={() => setNeedMe(null)}
        />
      )}
      {pending && (
        <StatusDialog
          pending={pending}
          owner={owner}
          onCancel={() => setPending(null)}
          onSave={async (extra) => {
            const err = await changeStatus(a.id, { status: pending.status, by: me, ...extra }, owner);
            if (!err) setPending(null);
            return err;
          }}
        />
      )}
    </li>
  );
}

function StatusDialog({
  pending,
  owner,
  onCancel,
  onSave,
}: {
  pending: Pending;
  owner: string;
  onCancel: () => void;
  onSave: (extra: { jiraUrl?: string; reason?: string; newOwner?: string }) => Promise<string | null>;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = {
    jiraUrl: { title: "Link the Jira ticket", body: "Paste the ticket link so anyone can follow the work.", label: "Jira ticket link", ph: "https://amberhq.atlassian.net/browse/P2-1234" },
    reason: { title: "Why won't we pick this up?", body: "A reason is required, so the next person reading this interview knows it was decided.", label: "Reason", ph: "e.g. Already covered by the search redesign" },
    newOwner: { title: "Who should own this?", body: `It's currently assigned to ${owner}. It will move to the person you pick and go back to Open.`, label: "Right owner", ph: "Start typing a name" },
  }[pending.needs];

  const submit = async () => {
    setBusy(true);
    const key = pending.needs;
    const err = await onSave({ [key]: value });
    setBusy(false);
    setError(err);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="sd-title">
        <h3 id="sd-title">{copy.title}</h3>
        <p>{copy.body}</p>
        <label htmlFor="sd-value">{copy.label}</label>
        {pending.needs === "reason" ? (
          <textarea id="sd-value" className="input" autoFocus maxLength={1000} placeholder={copy.ph} value={value} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <input
            id="sd-value"
            className="input"
            autoFocus
            list={pending.needs === "newOwner" ? "owner-people" : undefined}
            type={pending.needs === "jiraUrl" ? "url" : "text"}
            placeholder={copy.ph}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        )}
        <datalist id="owner-people">
          {knownPeople.filter((p) => p !== owner).map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
        <div className="row-end">
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit} disabled={busy || !value.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
