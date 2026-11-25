"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/export";
import { IdentityDialog } from "./IdentityDialog";
import { useTeam } from "./TeamState";
import { initials } from "./TopBar";

export function Comments({ interviewId }: { interviewId: string }) {
  const { state, me, addComment, removeComment } = useTeam();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askName, setAskName] = useState(false);

  const list = Object.values(state.comments)
    .filter((c) => c.interviewId === interviewId)
    .sort((a, b) => a.at.localeCompare(b.at));

  const submit = async () => {
    if (!me) return setAskName(true);
    setBusy(true);
    const err = await addComment(interviewId, text);
    setBusy(false);
    setError(err);
    if (!err) setText("");
  };

  return (
    <section className="card" id="comments">
      <div className="card-h">
        <h2>
          Comments <span className="count">{list.length || ""}</span>
        </h2>
      </div>
      <div className="card-b">
        {list.length === 0 && <p className="muted" style={{ margin: 0 }}>No comments yet. Add your view on this interview.</p>}
        {list.map((c) => (
          <div className="comment" key={c.id}>
            <span className="avatar">{initials(c.by)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="who">{c.by}</span>
              <span className="when">{fmtDate(c.at, true)}</span>
              {c.by === me && (
                <button
                  className="btn ghost small"
                  style={{ float: "right" }}
                  onClick={async () => setError(await removeComment(c.id))}
                >
                  Delete
                </button>
              )}
              <p>{c.text}</p>
            </div>
          </div>
        ))}
        <div className="comment-form">
          <label htmlFor="new-comment" className="muted" style={{ fontSize: 12 }}>
            {me ? `Commenting as ${me}` : "Add a comment"}
          </label>
          <textarea
            id="new-comment"
            className="input"
            placeholder="Your take on this interview: what you agree with, what's missing, what you'll do"
            value={text}
            maxLength={4000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
          />
          <div className="row-end">
            {error && <span className="error">{error}</span>}
            <button className="btn primary" onClick={submit} disabled={busy || !text.trim()}>
              Add comment
            </button>
          </div>
        </div>
      </div>
      {askName && <IdentityDialog reason="Pick your name before commenting." onClose={() => setAskName(false)} />}
    </section>
  );
}
