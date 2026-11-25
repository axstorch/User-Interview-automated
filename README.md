# Interview Insights (prototype)

One place for every user interview posted in Slack `#product-user-interviews`: who we spoke to, what we learned,
what we should do about it, and what each owner decided.

**Prototype status.** The interviews are a snapshot read from Slack, with the analysis done by Claude, and committed
as `data/interviews.json`. Nothing updates automatically yet: no Slack bot, no scheduled job, no login. See
[What the real version adds](#what-the-real-version-adds).

## What's in it

| Page | What it does |
| --- | --- |
| **Interviews** (`/`) | One row per interview. Search, filter by person type, status and theme, select rows, export Markdown or CSV. |
| **Interview** (`/interviews/<id>`) | Summary, actionables (highlighted), key insights, gaps, notes by topic, questions for next time, pre-call context, comments, and a preview of the Slack message the bot would post. Every item links to the Slack message it came from. |
| **Actionables** (`/actionables`) | Every actionable from every interview, filtered by status, owner, area and priority. This is the PM queue. |
| **Themes** (`/themes`) | How many interviews touched each theme, with the insights behind it. |

### Actionable statuses

| Status | Meaning | Asks for |
| --- | --- | --- |
| Open | No decision yet (default) | — |
| Is expected | Expected behaviour, no change needed | — |
| Jira ticket created | Work is tracked in Jira | Ticket link |
| Low priority | Valid, but not now | — |
| Will not pick up | We won't do this | Reason (required) |
| Mistakenly assigned | Not this person's area | The right owner. The actionable moves to them and goes back to **Open**; the history keeps the reassignment. |

Every change records who made it and when (see *History* under the actionable).

### Owners: routed like Felix

Each actionable is routed to a **pod**, exactly the way Felix (`amberhq/fix-it-felix`) routes #tech-problems.
`data/routing.json` is a copy of Felix's `ROUTE_GROUP_MAP` (pod → Slack user group) and its routing rules:

| Pod | Owns |
| --- | --- |
| Website team (`pod1`) | Website, search, property and listing pages, booking and payment flow |
| CRM & dialer team (`pod2`) | CRM, leads, agent tools, dialer and calls, attribution |
| Partner & whitelabel team (`pod3`) | Partner / flex dashboard, whitelabel, sub-partners |
| App team, AI team, China team | Mobile apps; chatbot / AI platform; China cluster |
| PLG team (`podPLG`) | Referrals, Amber+, pre-arrival and post-booking journeys |
| QA (`qa`) | Supply and content requests (Felix's interim owner) |
| No tech owner (`none`) | Research, marketing, sales-process and partnership-deal items: nobody is tagged |

The route of each actionable is stored as `route` in `data/interviews.json`. Like Felix, an item no pod clearly owns
gets **no tag** rather than a guess. "Mistakenly assigned" lets anyone move an actionable to the right pod. If Felix's
groups change, update `data/routing.json` from Felix's `slack-bot/app.py`.

### Who is "me"?

There's no login. The first time someone comments or changes a status, they pick their name, and the browser
remembers it. Anyone can type any name, so treat this as a prototype only.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3010
```

Locally, statuses and comments are saved to `.data/store.json`, so every browser on your machine shares them.

## Deploy on Vercel

1. In Vercel, **Add New → Project**, import this repo. No settings to change (framework: Next.js).
2. In the project, open **Storage → Create Database → Upstash for Redis** (free tier is fine) and connect it to the
   project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
3. Redeploy. The yellow "saved in this browser only" banner disappears once the database is connected.

Without step 2 the app still works, but each viewer's statuses and comments stay in their own browser.

Statuses and comments live in two Redis hashes, `ii:actionables` (actionable id → state) and `ii:comments`
(comment id → comment).

**Access:** the data includes student names and CRM lead links. Turn on **Vercel Authentication** (Settings →
Deployment Protection) or share the URL only inside the product team.

## Refreshing the interviews

`data/interviews.json` is the whole dataset. To refresh it until the bot exists, ask Claude (with the Slack
connector) to re-read `#product-user-interviews` and regenerate the file in the same shape (`lib/types.ts`), keeping
existing `id`s so saved statuses and comments stay attached. Actionable ids look like `<interview id>-a1`.

## What the real version adds

1. **Slack bot (read-only on the channel + post in threads).** Every ~15 minutes it reads new top-level messages and
   thread replies in `#product-user-interviews`. A message with a meet link and "interview with" starts an
   interview record keyed by the thread (meet links are reused, so never key on the link).
2. **Watch window.** Each interview thread is watched for ~7 days after the call time (calls get moved), and the
   extraction re-runs whenever a new reply looks like insights. Top-level insight posts are matched to their interview
   by name, lead link and date; unsure matches go to a "needs review" list.
3. **Claude extraction** produces the same JSON as `data/interviews.json` (prompt in this repo's history).
4. **Notification.** When an interview first gets actionables, the bot replies in the thread tagging each owner once
   (see the preview on each interview page). No actionables → only a ✅ reaction.
5. **Login** behind the Amber staff auth gateway, and a database instead of Redis.
