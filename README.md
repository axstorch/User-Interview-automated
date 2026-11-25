# Interview Insights (prototype)

Turn user interviews into clear product decisions. Interview Insights brings research, customer needs, and follow-up decisions into one place—so the team can spot recurring problems, understand who they affect, and make sure useful feedback has an owner.

## Why it exists

Customer conversations are valuable when what we learn changes what we do. This prototype helps the product team:

- See what customers are trying to do and where they get stuck.
- Connect individual observations to themes appearing across interviews.
- Turn feedback into decisions and follow-up work, with clear ownership.
- Keep a record of what the team decided and why.

The current interview collection is a snapshot from Slack `#product-user-interviews`, analyzed with Claude and committed as `data/interviews.json`. It does not update automatically yet. See [What a fuller version could add](#what-a-fuller-version-could-add).

## How the team uses it

| View | Product-team use |
| --- | --- |
| **Interviews** (`/`) | Find and compare conversations. Search and filter by person type, status, and theme; select interviews to export as Markdown or CSV. |
| **Interview** (`/interviews/<id>`) | Understand one conversation: its summary, key insights, gaps, topic notes, questions for next time, pre-call context, comments, actionables, and a preview of the Slack follow-up. |
| **Actionables** (`/actionables`) | Review product follow-ups across interviews. Filter by status, owner, area, and priority to see what needs a decision or next step. |
| **Themes** (`/themes`) | See which needs and topics recur across interviews, with the supporting insights behind each theme. |

## From customer need to team decision

Each actionable captures a potential response to something heard in an interview. The team can record what it decided, so feedback does not disappear after the conversation:

| Status | What the decision communicates | Follow-up needed |
| --- | --- | --- |
| Open | We have not decided what to do yet (default). | — |
| Is expected | The experience is working as intended; no change is needed. | — |
| Jira ticket created | The work is being tracked. | Ticket link |
| Low priority | The need is valid, but not a priority right now. | — |
| Will not pick up | We have decided not to take this on. | Reason (required) |
| Mistakenly assigned | This belongs with another team. | Choose the right owner. The actionable moves to them and returns to **Open**; its history records the reassignment. |

Every decision records who made it and when. Use the *History* under an actionable to understand how its status or ownership changed.

## Make ownership clear

Actionables are routed to the product area best placed to assess them. The current routing reflects the team's ownership areas:

| Product area | Typical topics |
| --- | --- |
| Website team | Website, search, property and listing pages, booking, and payment |
| CRM & dialer team | CRM, leads, agent tools, dialer and calls, attribution |
| Partner & whitelabel team | Partner and flex dashboards, whitelabel, sub-partners |
| App team | Mobile apps |
| AI team | Chatbot and AI platform |
| China team | China cluster |
| PLG team | Referrals, Amber+, pre-arrival, and post-booking journeys |
| QA | Supply and content requests (interim owner) |
| No product-area owner | Research, marketing, sales-process, and partnership-deal items; nobody is tagged by default |

When ownership is unclear, the item is left unassigned rather than sent to a team by guesswork. Anyone can use **Mistakenly assigned** to move an actionable to the right owner. The current routes and Slack groups are maintained in `data/routing.json`, based on Felix's `amberhq/fix-it-felix` routing; update them when team ownership changes.

## Prototype boundaries

This is a way to explore a better feedback-to-decision workflow, not yet a complete source of truth:

- Interview content is a manually refreshed snapshot; new Slack activity does not appear automatically.
- There is no sign-in. The first time someone comments or changes a status, they choose a name, which the browser remembers. Anyone can enter any name.
- Without a shared database, changes are local to the browser. Locally, statuses and comments are saved to `.data/store.json` and shared by browsers on the same machine. On a hosted deployment without Redis, each viewer's changes stay in their own browser.
- The data includes student names and CRM lead links. Restrict access to the product team; on Vercel, enable **Vercel Authentication** under Settings → Deployment Protection.

## Keeping interviews current

Until an automated workflow exists, refresh `data/interviews.json` by asking Claude (with the Slack connector) to re-read `#product-user-interviews` and regenerate the file in the shape defined by `lib/types.ts`. Keep existing IDs so saved decisions and comments remain connected. Actionable IDs look like `<interview id>-a1`.

## What a fuller version could add

A future version could make this a more timely and dependable part of the product team's research workflow:

1. **Keep interview records current.** Check the interview channel about every 15 minutes, pick up new conversations and thread replies, and associate them with the right interview. A thread—not a meeting link—identifies a conversation because meeting links can be reused.
2. **Capture evolving learning.** Revisit a thread for about seven days after the call, since calls can move and useful insights may arrive later. Refresh the analysis when new replies add insights.
3. **Connect related feedback.** Match standalone insight posts to interviews using the participant, lead link, and date; send uncertain matches for review rather than silently attaching them to the wrong conversation.
4. **Turn conversations into usable insights.** Use Claude to produce the same structured interview record used by the prototype.
5. **Close the loop with owners.** When an interview surfaces actionables, reply in its Slack thread with each owner tagged once. If there are no actionables, acknowledge the interview with a ✅ reaction.
6. **Make decisions attributable.** Add staff sign-in and shared data storage so the team can see who made decisions and access the same current state.

## For maintainers

### Run locally

```bash
npm install
npm run dev        # http://localhost:3010
```

### Deploy on Vercel

1. In Vercel, **Add New → Project**, import this repo. No settings to change (framework: Next.js).
2. In the project, open **Storage → Create Database → Upstash for Redis** (free tier is fine) and connect it to the project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
3. Redeploy. The yellow "saved in this browser only" banner disappears once the database is connected.

Statuses and comments live in two Redis hashes, `ii:actionables` (actionable id → state) and `ii:comments` (comment id → comment).
