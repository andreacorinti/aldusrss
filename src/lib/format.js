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

export function hashAccentColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 34%)`;
}

export function placeholderImage(seed, w, h) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}
