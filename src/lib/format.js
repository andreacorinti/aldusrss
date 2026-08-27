export function stripHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

export function relativeTime(dateStr, lang = "it") {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  const isEn = lang === "en";
  if (min < 1) return isEn ? "just now" : "ora";
  if (min < 60) return isEn ? `${min} min ago` : `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return isEn ? `${h}h ago` : `${h} ${h === 1 ? "ora" : "ore"} fa`;
  const days = Math.floor(h / 24);
  if (days < 7) return isEn ? `${days}d ago` : `${days} ${days === 1 ? "giorno" : "giorni"} fa`;
  return d.toLocaleDateString(isEn ? "en-GB" : "it-IT", { day: "numeric", month: "short" });
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function hashAccentColor(seed) {
  const hue = hashString(seed) % 360;
  return `hsl(${hue}, 45%, 34%)`;
}

// Il seed è spesso l'id/guid dell'articolo, che per alcuni feed (es. ANSA) è
// l'URL completo dell'articolo: passato così com'è a picsum.photos produce un
// seed enorme e "strano" che il servizio non gestisce bene (risposta non
// valida, bloccata dal browser come ORB). Riducendolo a un breve hash
// numerico prima di usarlo evita il problema qualunque sia l'id in ingresso.
export function placeholderImage(seed, w, h) {
  return `https://picsum.photos/seed/${hashString(seed)}/${w}/${h}`;
}
