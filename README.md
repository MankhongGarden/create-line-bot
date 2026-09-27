# create-line-bot

Scaffold a LINE bot that survives production.

```bash
npx create-line-bot my-bot
```

Next.js 16 (App Router) + Supabase + Vercel. No `@line/bot-sdk`, no heavy imports in the webhook
path — because the webhook has five seconds and cold starts eat them.

## Why this exists

Starting a LINE bot is easy. Keeping one alive is not. Every LINE bot I have shipped hit the same
six problems, and none of them are in the quickstart:

| Problem | What this template does |
| --- | --- |
| LINE times out the webhook after **5 seconds**, and a cold start with a fat SDK import eats most of it | Webhook verifies, writes one row, returns 200; work moves to a separate worker route via `after()` |
| LINE **retries** webhooks, and serverless functions can run twice | Four independent idempotency layers — event id, reply token, job claim, business dedupe key |
| A **reply token is single-use**; spending it twice throws | Conditional update claims the token before it is spent |
| Rich Menu uploads are **not idempotent** — run the script twice, get two menus | Name-based uploader that removes the previous menu first |
| **LIFF ID tokens** are trusted client-side far too often | Token is verified against LINE's API server-side on every link |
| `.env.local` **is not read by Vercel** | Deploy section spells out `vercel env add` per variable |

## Operate it from Claude, Cursor or any AI agent

Every generated project includes an MCP server wired to its own queue and database. Open the project
in Claude Code and ask:

> "Why did the bot stop replying?" → `line_queue_health`, `line_failed_jobs`, `line_retry_job`
> "How many followers did we gain yesterday, and how much push quota is left?"
> "Switch user U123… to the seller menu."

Generic LINE MCP servers can send messages. This one also knows your webhook queue, so it can tell
you *why* a message was never answered. Broadcast is off unless you opt in.

Already have a bot? The same server ships on its own as
[line-bot-ops-mcp](https://github.com/MankhongGarden/line-bot-ops-mcp): `npx -y line-bot-ops-mcp`.

## What you get

```
src/app/api/line/webhook/route.ts   signature verify + fast ack
src/app/api/line/worker/route.ts    claim jobs, reply, retry safely
src/app/api/liff/link/route.ts      server-side ID token verification
src/app/liff/page.tsx               LIFF init + login
src/lib/line.ts                     signature, reply, push, verifyIdToken (fetch only)
src/lib/jobs.ts                     enqueue, claim, reply-token guard
scripts/rich-menu.ts                idempotent Rich Menu uploader
mcp/server.ts                       MCP server: queue health, retries, push, Rich Menu, insight
.mcp.json                           Claude Code picks the server up automatically
supabase/migrations/0001_init.sql   line_jobs, line_users, claim_line_jobs()
```

## Setup

The generated project ships its own README with the full table of environment variables, the
message-flow diagram, and the deploy steps. Short version:

```bash
npx create-line-bot my-bot
cd my-bot
npm install
cp .env.example .env.local     # LINE + Supabase credentials
npm run db:push
npm run dev
```

Then set the channel webhook to `https://<origin>/api/line/webhook`.

## The long-form versions

Each shortcut above started as a written-up incident:

- [Surviving LINE's 5-second webhook timeout on Vercel](https://github.com/MankhongGarden/line-webhook-fast-ack-dispatcher-worker)
- [Role-based LINE Rich Menu architecture](https://github.com/MankhongGarden/line-rich-menu-role-based-template)
- [Meta Pixel undercounts inside LIFF — use CAPI](https://github.com/MankhongGarden/meta-capi-line-liff-conversion-tracking)
- [Why `error.tsx` misses async Server Component errors](https://github.com/MankhongGarden/nextjs-async-layout-unstable-rethrow)
- [PDPA-strict analytics on Next.js + Supabase](https://github.com/MankhongGarden/nextjs-supabase-pdpa-analytics)
- [Pre-launch smoke test for Next.js + Supabase + Stripe](https://github.com/MankhongGarden/marketplace-prelaunch-smoke-test)

## Status

v0.2 — bot + LIFF + Supabase on Vercel, plus an MCP server to run it from an AI agent. Issues and
PRs welcome, especially from anyone running LINE bots at scale in Thailand or Japan.

## Sponsor

LINE changes its Messaging API several times a year, and a scaffolder is only useful if what it
generates still works on the day you run it. Sponsorship pays for keeping it that way: tracking API
changes, re-testing the template against new Next.js and Supabase releases, and answering issues.

If your team runs a bot built from this, [sponsor on GitHub](https://github.com/sponsors/MankhongGarden).

## License

MIT
