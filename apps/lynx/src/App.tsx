import Compose from "./pages/Compose";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0c10",
        color: "#e6edf3",
        width: "100vw",
        margin: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "24px",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        <header
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <img
            src="/KPG.svg"
            alt="KYC Gateway Logo"
            style={{
              width: 75,
              height: 75,
              borderRadius: 100,
              objectFit: "contain", // Ensures logo scales properly
            }}
          />
          <h1 style={{ fontSize: 22, margin: 0 }}>KYC Privacy Gateway (KPG)</h1>
        </header>
        <Compose />
      </div>
    </div>
  );
}
