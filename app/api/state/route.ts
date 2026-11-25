import { NextResponse } from "next/server";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadState(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[state] load failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load saved statuses and comments" }, { status: 503 });
  }
}
