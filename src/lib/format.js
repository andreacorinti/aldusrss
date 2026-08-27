export function stripHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

const IT_MONTHS = {
  gen: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", mag: "May", giu: "Jun",
  lug: "Jul", ago: "Aug", set: "Sep", ott: "Oct", nov: "Nov", dic: "Dec",
};

// `Date.parse` capisce solo l'inglese: un feed che localizza il pubDate in
// italiano (es. Sky Sport: "gio, 27 ago 2026 10:10:00 GMT") viene letto come
// data non valida, e un articolo pubblicato oggi finisce trattato come
// "senza data" — invisibile alla finestra di freschezza, silenziosamente
// spinto in fondo all'ordinamento per recency. Qui si tenta prima il parsing
// nativo e, solo se fallisce, si prova a tradurre il mese abbreviato in
// italiano prima di riprovare.
export function parseDate(dateStr) {
  if (!dateStr) return NaN;
  const direct = Date.parse(dateStr);
  if (!Number.isNaN(direct)) return direct;
  const match = dateStr.match(/(\d{1,2})\s+([a-zà-ù]{3,})\.?\s+(\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)\s*(.*)$/i);
  if (!match) return NaN;
  const [, day, monthRaw, year, time, tz] = match;
  const monthEn = IT_MONTHS[monthRaw.toLowerCase().slice(0, 3)];
  if (!monthEn) return NaN;
  return Date.parse(`${day} ${monthEn} ${year} ${time} ${tz}`.trim());
}

export function relativeTime(dateStr, lang = "it") {
  const t = parseDate(dateStr);
  const d = new Date(t);
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
