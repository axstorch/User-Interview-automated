import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { ActionableState, Comment, TeamState } from "./types";

// Vercel's Redis (Upstash) integration injects KV_REST_API_* ; a direct Upstash
// database uses UPSTASH_REDIS_REST_*. Either works.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const KEY_A = "ii:actionables";
const KEY_C = "ii:comments";

// Without Redis: on your laptop we keep a JSON file so `npm run dev` is shared
// across browsers; on Vercel the filesystem is read-only, so the app falls back
// to saving in each viewer's browser.
const FILE = path.join(process.cwd(), ".data", "store.json");
const useFile = !redis && !process.env.VERCEL;

export const storeMode: TeamState["mode"] = redis || useFile ? "shared" : "browser";

type FileShape = { actionables: Record<string, ActionableState>; comments: Record<string, Comment> };

async function readFile(): Promise<FileShape> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { actionables: {}, comments: {} };
  }
}

async function writeFile(data: FileShape) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2));
}

export async function loadState(): Promise<TeamState> {
  if (redis) {
    const [a, c] = await Promise.all([
      redis.hgetall<Record<string, ActionableState>>(KEY_A),
      redis.hgetall<Record<string, Comment>>(KEY_C),
    ]);
    return { mode: "shared", actionables: a ?? {}, comments: c ?? {} };
  }
  if (useFile) return { mode: "shared", ...(await readFile()) };
  return { mode: "browser", actionables: {}, comments: {} };
}

export async function getActionable(id: string): Promise<ActionableState | undefined> {
  if (redis) return (await redis.hget<ActionableState>(KEY_A, id)) ?? undefined;
  if (useFile) return (await readFile()).actionables[id];
  return undefined;
}

export async function saveActionable(id: string, s: ActionableState) {
  if (redis) return void (await redis.hset(KEY_A, { [id]: s }));
  if (useFile) {
    const d = await readFile();
    d.actionables[id] = s;
    await writeFile(d);
  }
}

export async function saveComment(c: Comment) {
  if (redis) return void (await redis.hset(KEY_C, { [c.id]: c }));
  if (useFile) {
    const d = await readFile();
    d.comments[c.id] = c;
    await writeFile(d);
  }
}

export async function getComment(id: string): Promise<Comment | undefined> {
  if (redis) return (await redis.hget<Comment>(KEY_C, id)) ?? undefined;
  if (useFile) return (await readFile()).comments[id];
  return undefined;
}

export async function deleteComment(id: string) {
  if (redis) return void (await redis.hdel(KEY_C, id));
  if (useFile) {
    const d = await readFile();
    delete d.comments[id];
    await writeFile(d);
  }
}
