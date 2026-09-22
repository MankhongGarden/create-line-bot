import { timingSafeEqual } from "node:crypto";
import { claimNext, consumeReplyToken, markDone, markFailed, type Job } from "@/lib/jobs";
import { reply, text } from "@/lib/line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!authorized(request.headers.get("x-worker-secret"))) {
    return new Response("forbidden", { status: 403 });
  }

  const jobs = await claimNext();
  let handled = 0;

  for (const job of jobs) {
    try {
      await handle(job);
      await markDone(job.id);
      handled += 1;
    } catch (error) {
      console.error("[worker] job failed", job.id, error);
      await markFailed(job.id, error instanceof Error ? error.message : String(error));
    }
  }

  return Response.json({ claimed: jobs.length, handled });
}

async function handle(job: Job) {
  const event = job.payload;

  if (event.type !== "message" || event.message?.type !== "text") return;
  if (!event.replyToken) return;

  // A reply token is single-use; claim it before spending it so a retry cannot double-send.
  if (!(await consumeReplyToken(job.id))) return;

  await reply(event.replyToken, [text(`You said: ${event.message.text}`)]);
}

function authorized(provided: string | null): boolean {
  const expected = process.env.WORKER_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
