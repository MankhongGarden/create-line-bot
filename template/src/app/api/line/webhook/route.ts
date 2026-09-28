import { after } from "next/server";
import { verifySignature, type LineEvent } from "@/lib/line";
import { enqueue } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(request: Request) {
  // Signature is computed over the exact bytes LINE sent, so read the body as text first.
  const raw = await request.text();

  if (!verifySignature(raw, request.headers.get("x-line-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }

  const events = (JSON.parse(raw).events ?? []) as LineEvent[];

  await enqueue(events);

  // Derive the worker URL from this request so WORKER_SECRET can only ever go to this same deployment.
  const workerUrl = new URL("/api/line/worker", request.url);

  after(async () => {
    try {
      await fetch(workerUrl, {
        method: "POST",
        headers: { "x-worker-secret": process.env.WORKER_SECRET ?? "" },
      });
    } catch (error) {
      console.error("[webhook] worker kick failed", error);
    }
  });

  return new Response("ok");
}
