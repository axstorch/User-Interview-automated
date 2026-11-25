"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTeam } from "./TeamState";
import { IdentityDialog } from "./IdentityDialog";

export const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const NAV = [
  { href: "/", label: "Interviews" },
  { href: "/actionables", label: "Actionables" },
  { href: "/themes", label: "Themes" },
];

export function TopBar() {
  const path = usePathname();
  const { me, state, ready, loadError } = useTeam();
  const [asking, setAsking] = useState(false);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="logo" aria-label="Interview Insights home">
            <span className="logo-mark" aria-hidden>
              a
            </span>
            <span>
              amber <small>/ Interview Insights</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Sections">
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" || path.startsWith("/interviews") : path.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <span className="spacer" />
          <button className="me-chip" onClick={() => setAsking(true)} title="Change who you are">
            <span className="avatar">{me ? initials(me) : "?"}</span>
            <span className="me-name">{me || "Who are you?"}</span>
          </button>
        </div>
      </header>
      {ready && state.mode === "browser" && (
        <div className="banner-wrap">
          <div className="banner" role="status">
            {loadError ? `${loadError}. ` : ""}Statuses and comments are saved in this browser only. Connect a Redis database
            to the Vercel project so the whole team sees them.
          </div>
        </div>
      )}
      {asking && <IdentityDialog onClose={() => setAsking(false)} />}
    </>
  );
}
