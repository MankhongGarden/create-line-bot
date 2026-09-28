# Privacy Policy

Last updated: 2026-09-28

## The CLI

`npx create-line-bot` copies a template into a new folder on your machine. It collects nothing and
makes no network requests of its own. With `--install` it runs `npm install`, which talks to the
npm registry under npm's own policy.

## The generated project

The project is yours: it runs on your Vercel and Supabase accounts with your LINE credentials. The
maintainer operates no server, analytics or telemetry for it and receives no data from it.

As generated, the app sends data only to:

- LINE — `api.line.me` for replies, pushes, Rich Menus and LIFF ID token verification,
  `api-data.line.me` for Rich Menu images, and the LIFF SDK in your users' browsers
- your own Supabase project — the `line_jobs` queue and `line_users`
- its own deployment — the webhook calls `/api/line/worker` on the same origin the request came in on

## The MCP server

Generated projects use [line-bot-ops-mcp](https://github.com/MankhongGarden/line-bot-ops-mcp), which
runs locally and has its own [privacy policy](https://github.com/MankhongGarden/line-bot-ops-mcp/blob/main/PRIVACY.md).

## Your users' data

Messages and profiles from people who use your bot belong to your LINE Official Account and your
Supabase project. You are the controller of that data and responsible for your own privacy notice
to them.

## Contact

Open an issue at https://github.com/MankhongGarden/create-line-bot/issues.
