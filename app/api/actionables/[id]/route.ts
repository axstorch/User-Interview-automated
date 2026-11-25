import { NextResponse } from "next/server";
import { allActionables, ownerOf } from "@/lib/data";
import { applyChange, validateChange } from "@/lib/statuses";
import { getActionable, saveActionable, storeMode } from "@/lib/store";
import type { StatusChange } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (storeMode !== "shared") return NextResponse.json({ error: "No shared database configured" }, { status: 501 });

  const found = allActionables.find((x) => x.actionable.id === params.id);
  if (!found) return NextResponse.json({ error: "Unknown actionable" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Partial<StatusChange> | null;
  const err = validateChange(body ?? {});
  if (err) return NextResponse.json({ error: err }, { status: 422 });

  try {
    const prev = await getActionable(params.id);
    const next = applyChange(prev, body as StatusChange, ownerOf(found.actionable, prev));
    await saveActionable(params.id, next);
    return NextResponse.json(next);
  } catch (e) {
    console.error("[actionables] save failed", params.id, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 503 });
  }
}
