import type { LineEvent } from "./line";
import { admin } from "./supabase";

export type Job = {
  id: string;
  event_id: string;
  payload: LineEvent;
  attempts: number;
};

export async function enqueue(events: LineEvent[]) {
  if (events.length === 0) return;
  const rows = events.map((event) => ({
    event_id: event.webhookEventId,
    payload: event,
    dedupe_key: dedupeKey(event),
  }));
  const { error } = await admin()
    .from("line_jobs")
    .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });
  if (error) throw new Error(`enqueue failed: ${error.message}`);
}

export async function claimNext(limit = 10): Promise<Job[]> {
  const { data, error } = await admin().rpc("claim_line_jobs", { batch_size: limit });
  if (error) throw new Error(`claim failed: ${error.message}`);
  return (data ?? []) as Job[];
}

export async function markDone(id: string) {
  await admin().from("line_jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", id);
}

export async function markFailed(id: string, reason: string) {
  await admin()
    .from("line_jobs")
    .update({ status: "failed", last_error: reason.slice(0, 1000), finished_at: new Date().toISOString() })
    .eq("id", id);
}

export async function consumeReplyToken(jobId: string): Promise<boolean> {
  const { data, error } = await admin()
    .from("line_jobs")
    .update({ reply_token_used: true })
    .eq("id", jobId)
    .eq("reply_token_used", false)
    .select("id");
  if (error) throw new Error(`reply token guard failed: ${error.message}`);
  return (data ?? []).length > 0;
}

function dedupeKey(event: LineEvent): string | null {
  if (event.type === "message" && event.message?.id) return `message:${event.message.id}`;
  return null;
}
