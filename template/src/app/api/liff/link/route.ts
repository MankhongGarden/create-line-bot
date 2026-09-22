import { verifyIdToken } from "@/lib/line";
import { admin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { idToken } = await request.json();
  if (typeof idToken !== "string") {
    return new Response("idToken required", { status: 400 });
  }

  let profile;
  try {
    profile = await verifyIdToken(idToken);
  } catch {
    return new Response("invalid id token", { status: 401 });
  }

  const { data, error } = await admin()
    .from("line_users")
    .upsert(
      {
        line_user_id: profile.sub,
        display_name: profile.name ?? null,
        picture_url: profile.picture ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "line_user_id" }
    )
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });

  return Response.json(data);
}
