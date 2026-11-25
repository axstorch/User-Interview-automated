import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { interviewIds } from "@/lib/data";
import { deleteComment, getComment, saveComment, storeMode } from "@/lib/store";
import type { Comment } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (storeMode !== "shared") return NextResponse.json({ error: "No shared database configured" }, { status: 501 });

  const body = (await req.json().catch(() => null)) as Partial<Comment> | null;
  const interviewId = String(body?.interviewId ?? "");
  const by = String(body?.by ?? "").trim();
  const text = String(body?.text ?? "").trim();

  if (!interviewIds.has(interviewId)) return NextResponse.json({ error: "Unknown interview" }, { status: 404 });
  if (!by || by.length > 80) return NextResponse.json({ error: "Tell us who you are first" }, { status: 422 });
  if (!text) return NextResponse.json({ error: "Write something first" }, { status: 422 });
  if (text.length > 4000) return NextResponse.json({ error: "Comment is too long (4000 characters max)" }, { status: 422 });

  const comment: Comment = { id: randomUUID(), interviewId, by, text, at: new Date().toISOString() };
  try {
    await saveComment(comment);
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error("[comments] save failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 503 });
  }
}

// Prototype rule (no login yet): only the name that wrote a comment can delete it.
export async function DELETE(req: Request) {
  if (storeMode !== "shared") return NextResponse.json({ error: "No shared database configured" }, { status: 501 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const by = (searchParams.get("by") ?? "").trim();
  const existing = await getComment(id);
  if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  if (existing.by !== by) return NextResponse.json({ error: "Only the author can delete this comment" }, { status: 403 });
  await deleteComment(id);
  return new NextResponse(null, { status: 204 });
}
