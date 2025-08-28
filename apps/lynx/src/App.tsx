import Compose from './pages/Compose';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#0b0c10', color: '#e6edf3' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <header style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#8e2de2,#4a00e0)'
          }} />
          <h1 style={{ fontSize: 22, margin: 0 }}>KYC Privacy Gateway (KPG)</h1>
        </header>
        <Compose />
      </div>
    </div>
  );
}
