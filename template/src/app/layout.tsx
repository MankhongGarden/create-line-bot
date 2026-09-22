import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "LINE bot",
  description: "LINE bot on Next.js + Supabase",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
