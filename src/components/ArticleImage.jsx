import { useState } from "react";
import { hashAccentColor } from "../lib/format";

// Fonti come ANSA non pubblicano mai un'immagine reale nel feed (verificato:
// zero su decine di articoli, sia nel feed principale che in Economia). Al
// posto di una foto stock scelta a caso (sembra sempre "sbagliata", perché
// non ha alcun rapporto col contenuto), un riquadro monocromatico con il nome
// della testata: la sola iniziale (prima versione) risultava "distraente" a
// vedersi ripetuta identica in ogni card senza indicare nulla — il nome per
// esteso resta un placeholder onesto (non finge di essere una foto
// dell'articolo) ma comunica qualcosa di reale, la fonte, invece di una
// lettera vuota (segnalato dall'utente).
export function ArticleImage({ src, seed, label, className, style, fontSize = "22px" }) {
  // Alcuni feed (es. GameSurf) pubblicano URL immagine già rotti in partenza
  // (404 sul loro stesso CDN, non un problema di rete nostro): senza gestire
  // l'errore di caricamento, l'utente si ritrovava l'icona di immagine rotta
  // del browser al posto del placeholder con iniziale, per ogni articolo di
  // quella fonte (segnalato dall'utente).
  const [broken, setBroken] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setBroken(false);
  }
  if (src && !broken) {
    return <img src={src} alt="" className={className} style={style} onError={() => setBroken(true)} />;
  }
  return (
    <div
      className={className}
      style={{ ...style, backgroundColor: hashAccentColor(seed || "?"), display: "flex", alignItems: "center", justifyContent: "center", padding: "10%" }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.92)",
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize,
          lineHeight: 1.15,
          textAlign: "center",
          overflowWrap: "break-word",
        }}
      >
        {label || "?"}
      </span>
    </div>
  );
}
