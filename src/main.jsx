import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

// Ultima rete di sicurezza, fuori da App.jsx: il boundary interno (vedi
// App.jsx) copre un errore mentre una scheda è già in piedi, ma non un
// errore nell'inizializzazione di App stesso (es. un bug nell'ordine degli
// hook) — senza questo, quel caso restava comunque una schermata bianca.
// Niente stato/tema disponibile qui (App potrebbe non essersi mai montato),
// quindi solo un messaggio semplice e un ricaricamento completo.
const rootFallback = (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', padding: '32px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#EDE8DC', color: '#211D19' }}>
    <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>AldusRSS ha incontrato un errore imprevisto.</p>
    <button
      onClick={() => window.location.reload()}
      style={{ marginTop: '4px', padding: '10px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#211D19', color: '#EDE8DC', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
    >
      Ricarica
    </button>
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={rootFallback}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
