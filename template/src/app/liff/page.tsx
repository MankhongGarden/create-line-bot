"use client";

import { useEffect, useState } from "react";

type State =
  | { phase: "loading" }
  | { phase: "ready"; name: string }
  | { phase: "error"; message: string };

export default function LiffPage() {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error("No ID token from LIFF");

        const res = await fetch("/api/liff/link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!res.ok) throw new Error(await res.text());

        const user = await res.json();
        if (!cancelled) setState({ phase: "ready", name: user.display_name ?? "there" });
      } catch (error) {
        if (!cancelled) {
          setState({ phase: "error", message: error instanceof Error ? error.message : String(error) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === "loading") return <main style={wrap}>Connecting…</main>;
  if (state.phase === "error") return <main style={wrap}>Could not sign you in: {state.message}</main>;
  return <main style={wrap}>Signed in as {state.name}.</main>;
}

const wrap: React.CSSProperties = {
  minHeight: "100svh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  fontFamily: "system-ui, sans-serif",
};
