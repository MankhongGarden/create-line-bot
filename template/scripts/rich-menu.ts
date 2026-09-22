import { readFile } from "node:fs/promises";
import { join } from "node:path";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";

type MenuSpec = {
  name: string;
  image: string;
  default?: boolean;
  menu: Record<string, unknown>;
};

const SIZE_COMPACT = { width: 2500, height: 843 };

const cell = (row: number, col: number, action: Record<string, unknown>) => ({
  bounds: { x: col * 833, y: row * 421, width: 833, height: 421 },
  action,
});

const menus: MenuSpec[] = [
  {
    name: "default-menu",
    image: "assets/rich-menu-default.png",
    default: true,
    menu: {
      size: SIZE_COMPACT,
      selected: true,
      name: "default-menu",
      chatBarText: "Menu",
      areas: [
        cell(0, 0, { type: "uri", label: "Open app", uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}` }),
        cell(0, 1, { type: "message", label: "Help", text: "help" }),
        cell(0, 2, { type: "message", label: "Status", text: "status" }),
      ],
    },
  },
];

async function api(path: string, init: RequestInit = {}, base = API) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res;
}

async function existingByName(): Promise<Map<string, string>> {
  const res = await api("/richmenu/list");
  const { richmenus } = (await res.json()) as { richmenus: { richMenuId: string; name: string }[] };
  return new Map(richmenus.map((m) => [m.name, m.richMenuId]));
}

async function main() {
  const existing = await existingByName();

  for (const spec of menus) {
    const previous = existing.get(spec.name);
    if (previous) {
      await api(`/richmenu/${previous}`, { method: "DELETE" });
      console.log(`deleted old ${spec.name}`);
    }

    const created = await api("/richmenu", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(spec.menu),
    });
    const { richMenuId } = (await created.json()) as { richMenuId: string };

    const image = await readFile(join(process.cwd(), spec.image));
    await api(
      `/richmenu/${richMenuId}/content`,
      { method: "POST", headers: { "content-type": "image/png" }, body: image },
      DATA_API
    );

    if (spec.default) {
      await api(`/user/all/richmenu/${richMenuId}`, { method: "POST" });
    }

    console.log(`${spec.name} -> ${richMenuId}${spec.default ? " (default)" : ""}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
