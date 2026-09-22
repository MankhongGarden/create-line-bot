import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "./env";

const API = "https://api.line.me/v2/bot";

export type LineEvent = {
  type: string;
  webhookEventId: string;
  replyToken?: string;
  source?: { type: string; userId?: string; groupId?: string; roomId?: string };
  message?: { id: string; type: string; text?: string };
  timestamp: number;
};

export function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", requireEnv("LINE_CHANNEL_SECRET"))
    .update(rawBody)
    .digest();
  const received = Buffer.from(signature, "base64");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

async function call(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${requireEnv("LINE_CHANNEL_ACCESS_TOKEN")}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`LINE ${path} ${res.status}: ${await res.text()}`);
  }
  return res;
}

export function reply(replyToken: string, messages: unknown[]) {
  return call("/message/reply", { replyToken, messages });
}

export function push(to: string, messages: unknown[]) {
  return call("/message/push", { to, messages });
}

export function text(value: string) {
  return { type: "text", text: value };
}

export async function verifyIdToken(idToken: string): Promise<{ sub: string; name?: string; picture?: string }> {
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: requireEnv("NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID"),
    }),
  });
  if (!res.ok) throw new Error(`ID token verification failed: ${await res.text()}`);
  return res.json();
}
