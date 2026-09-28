# LINE bot

Generated with [`create-line-bot`](https://github.com/MankhongGarden/create-line-bot).

## Setup

1. `cp .env.example .env.local` and fill in:

| Variable | Where it comes from |
| --- | --- |
| `LINE_CHANNEL_SECRET` | LINE Developers → Messaging API channel → Basic settings |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API channel → Messaging API tab (long-lived token) |
| `NEXT_PUBLIC_LIFF_ID` | LINE Login channel → LIFF tab |
| `NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID` | LINE Login channel → Basic settings |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project settings → API |
| `WORKER_SECRET` | Any random string, e.g. `openssl rand -hex 32` |

The webhook calls the worker on the same origin the request came in on, so `WORKER_SECRET` never
leaves your deployment and there is no URL to configure.

2. `npm run db:push` — applies `supabase/migrations/0001_init.sql`.
3. `npm run dev`, expose it (`ngrok http 3000` or deploy), then set the channel webhook to `https://<origin>/api/line/webhook` and press Verify.

## How a message flows

```
LINE  ──POST /api/line/webhook──►  verify signature
                                   insert jobs  (one DB round-trip)
                                   return 200            ◄── under LINE's 5s limit
                                   after() → POST /api/line/worker
                                                    │
                                              claim jobs (SKIP LOCKED)
                                              reply / push
```

The webhook never does real work. Everything slow happens in the worker, which has its own
`maxDuration` and can be retried without the webhook timing out.

## Idempotency

LINE retries webhooks, and Vercel can run a function twice. Four independent guards:

| Layer | Mechanism |
| --- | --- |
| Webhook event | `line_jobs.event_id` unique — a redelivered event is ignored on insert |
| Reply token | `reply_token_used` flipped by a conditional update before the reply is sent |
| Job execution | `claim_line_jobs()` moves rows `pending → processing` with `FOR UPDATE SKIP LOCKED` |
| Business action | partial unique index on `dedupe_key` (defaults to the LINE message id) |

Stuck jobs are re-claimed after 5 minutes, up to 5 attempts.

## Rich Menu

Put a 2500×843 PNG at `assets/rich-menu-default.png`, then:

```bash
npm run rich-menu
```

The script deletes the previous menu with the same name before creating the new one, so running
it twice leaves one menu, not two. Edit `menus` in `scripts/rich-menu.ts` to add role-specific
menus and link them with `POST /v2/bot/user/{userId}/richmenu/{richMenuId}`.

## LIFF login

`/liff` initialises LIFF, sends the ID token to `/api/liff/link`, and the server verifies it with
LINE before upserting `line_users`. The client never asserts who it is — the ID token is checked
server-side every time.

## Deploy

```bash
vercel
vercel env add LINE_CHANNEL_SECRET production   # repeat for each variable
```

`.env.local` is not read by Vercel. Every variable must be added to the project.

## Run the bot from Claude (MCP)

The project comes wired to [line-bot-ops-mcp](https://github.com/MankhongGarden/line-bot-ops-mcp)
(a dev dependency), so Claude Code, Claude Desktop, Cursor or any MCP client can operate the bot
with the same credentials as the app.

Claude Code picks up `.mcp.json` automatically when you open the project. For other clients, point
them at:

```bash
node --env-file=.env.local node_modules/line-bot-ops-mcp/dist/index.js
```

| Tool | What it does |
| --- | --- |
| `line_queue_health` | Jobs per status, oldest pending age, stuck workers — start here when the bot "stops replying" |
| `line_failed_jobs` | Latest failures with error, user and message text |
| `line_retry_job` | Put a failed job back to pending |
| `line_bot_info` · `line_message_quota` · `line_followers_insight` | Account info, quota used this month, daily follower stats |
| `line_get_profile` · `line_find_users` | Look up a LINE profile or linked users by name/role |
| `line_richmenu_list` · `line_link_richmenu` | See menus and the default; swap one user's menu |
| `line_push_text` | Message one user, group or room |
| `line_broadcast` | Message every friend — only registered when `LINE_MCP_ALLOW_BROADCAST=true` |

Every tool runs on your machine with your keys. Nothing is proxied.
