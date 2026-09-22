export default function Home() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Your LINE bot is running</h1>
        <p style={{ margin: 0, color: "#666" }}>
          Point the channel webhook at <code>/api/line/webhook</code>
        </p>
      </div>
    </main>
  );
}
