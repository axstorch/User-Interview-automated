"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyChange, validateChange } from "@/lib/statuses";
import type { ActionableState, Comment, StatusChange, TeamState } from "@/lib/types";

const LOCAL_KEY = "ii:state:v1";
const ME_KEY = "ii:me";

function readLocal(): Omit<TeamState, "mode"> {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    if (v && typeof v === "object") return { actionables: v.actionables ?? {}, comments: v.comments ?? {} };
  } catch {}
  return { actionables: {}, comments: {} };
}

function writeLocal(s: TeamState) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ actionables: s.actionables, comments: s.comments }));
  } catch {}
}

type Ctx = {
  state: TeamState;
  ready: boolean;
  loadError: string | null;
  me: string;
  setMe: (name: string) => void;
  changeStatus: (id: string, change: StatusChange, currentOwner: string) => Promise<string | null>;
  addComment: (interviewId: string, text: string) => Promise<string | null>;
  removeComment: (id: string) => Promise<string | null>;
};

const TeamCtx = createContext<Ctx | null>(null);

export function TeamStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TeamState>({ mode: "shared", actionables: {}, comments: {} });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMeState] = useState("");

  useEffect(() => {
    try {
      setMeState(localStorage.getItem(ME_KEY) || "");
    } catch {}
    fetch("/api/state", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error || "Could not load saved data");
        const s = body as TeamState;
        setState(s.mode === "browser" ? { mode: "browser", ...readLocal() } : s);
      })
      .catch((e: Error) => {
        setLoadError(e.message);
        setState({ mode: "browser", ...readLocal() });
      })
      .finally(() => setReady(true));
  }, []);

  const setMe = useCallback((name: string) => {
    const n = name.trim().slice(0, 80);
    setMeState(n);
    try {
      localStorage.setItem(ME_KEY, n);
    } catch {}
  }, []);

  const update = useCallback((fn: (s: TeamState) => TeamState) => {
    setState((s) => {
      const next = fn(s);
      if (next.mode === "browser") writeLocal(next);
      return next;
    });
  }, []);

  const changeStatus = useCallback<Ctx["changeStatus"]>(
    async (id, change, currentOwner) => {
      const err = validateChange(change);
      if (err) return err;
      if (state.mode === "browser") {
        update((s) => ({ ...s, actionables: { ...s.actionables, [id]: applyChange(s.actionables[id], change, currentOwner) } }));
        return null;
      }
      const r = await fetch(`/api/actionables/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      }).catch(() => null);
      if (!r) return "Network error. Try again.";
      const body = await r.json().catch(() => ({}));
      if (!r.ok) return body?.error || "Could not save";
      update((s) => ({ ...s, actionables: { ...s.actionables, [id]: body as ActionableState } }));
      return null;
    },
    [state.mode, update],
  );

  const addComment = useCallback<Ctx["addComment"]>(
    async (interviewId, text) => {
      if (!me) return "Tell us who you are first";
      if (!text.trim()) return "Write something first";
      if (state.mode === "browser") {
        const c: Comment = { id: crypto.randomUUID(), interviewId, by: me, text: text.trim(), at: new Date().toISOString() };
        update((s) => ({ ...s, comments: { ...s.comments, [c.id]: c } }));
        return null;
      }
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, text, by: me }),
      }).catch(() => null);
      if (!r) return "Network error. Try again.";
      const body = await r.json().catch(() => ({}));
      if (!r.ok) return body?.error || "Could not save";
      update((s) => ({ ...s, comments: { ...s.comments, [body.id]: body as Comment } }));
      return null;
    },
    [me, state.mode, update],
  );

  const removeComment = useCallback<Ctx["removeComment"]>(
    async (id) => {
      if (state.mode === "shared") {
        const r = await fetch(`/api/comments?id=${encodeURIComponent(id)}&by=${encodeURIComponent(me)}`, {
          method: "DELETE",
        }).catch(() => null);
        if (!r) return "Network error. Try again.";
        if (!r.ok) return (await r.json().catch(() => ({})))?.error || "Could not delete";
      }
      update((s) => {
        const comments = { ...s.comments };
        delete comments[id];
        return { ...s, comments };
      });
      return null;
    },
    [me, state.mode, update],
  );

  const value = useMemo(
    () => ({ state, ready, loadError, me, setMe, changeStatus, addComment, removeComment }),
    [state, ready, loadError, me, setMe, changeStatus, addComment, removeComment],
  );
  return <TeamCtx.Provider value={value}>{children}</TeamCtx.Provider>;
}

export function useTeam() {
  const v = useContext(TeamCtx);
  if (!v) throw new Error("useTeam outside TeamStateProvider");
  return v;
}
