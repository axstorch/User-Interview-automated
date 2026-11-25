"use client";

import { useState } from "react";
import { knownPeople } from "@/lib/data";
import { useTeam } from "./TeamState";

/** No login in the prototype: people pick their name once and it is remembered in the browser. */
export function IdentityDialog({ onClose, reason }: { onClose: () => void; reason?: string }) {
  const { me, setMe } = useTeam();
  const [name, setName] = useState(me);

  const save = () => {
    if (!name.trim()) return;
    setMe(name);
    onClose();
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="who-title">
        <h3 id="who-title">Who are you?</h3>
        <p>{reason ?? "Your name goes on the comments and status changes you make. There's no login in this prototype."}</p>
        <label htmlFor="who">Your name</label>
        <input
          id="who"
          className="input"
          list="people"
          value={name}
          autoFocus
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Start typing your name"
        />
        <datalist id="people">
          {knownPeople.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className="row-end">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
