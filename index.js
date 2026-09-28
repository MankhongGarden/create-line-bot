#!/usr/bin/env node
import { cp, readFile, writeFile, rename, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = join(here, "template");

const RENAME = [
  ["_gitignore", ".gitignore"],
  ["_env.example", ".env.example"],
  ["_mcp.json", ".mcp.json"],
];

function parseArgs(argv) {
  const args = { dir: null, install: false };
  for (const arg of argv) {
    if (arg === "--install" || arg === "-i") args.install = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (!arg.startsWith("-") && !args.dir) args.dir = arg;
  }
  return args;
}

function usage() {
  console.log(`
create-line-bot — scaffold a LINE bot on Next.js + Supabase + Vercel

  npx create-line-bot my-bot
  npx create-line-bot my-bot --install

Options
  -i, --install   run npm install in the new directory
  -h, --help      show this message
`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  const target = resolve(process.cwd(), args.dir ?? "line-bot");
  const name = basename(target);

  if (await exists(target)) {
    console.error(`Refusing to overwrite: ${target} already exists.`);
    process.exit(1);
  }

  await cp(templateDir, target, { recursive: true });

  for (const [from, to] of RENAME) {
    const src = join(target, from);
    if (await exists(src)) await rename(src, join(target, to));
  }

  const pkgPath = join(target, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.name = name.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  if (args.install) {
    const { spawnSync } = await import("node:child_process");
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    spawnSync(npm, ["install"], { cwd: target, stdio: "inherit" });
  }

  console.log(`
Created ${name}

Next steps
  cd ${args.dir ?? "line-bot"}${args.install ? "" : "\n  npm install"}
  cp .env.example .env.local        # fill in LINE + Supabase credentials
  npm run db:push                   # apply supabase/migrations
  npm run dev

Then point your LINE channel webhook at
  https://<your-deployment>/api/line/webhook

Operate it from Claude Code: open the folder, .mcp.json loads line-bot-ops-mcp.

Full setup guide: https://github.com/MankhongGarden/create-line-bot#setup
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
