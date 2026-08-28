// Ricerca "per nome" delle testate già conosciute dall'app (default +
// pacchetti curati), richiesta dai beta tester: scrivendo "resto del
// carlino" o "sky sport" si vuole trovare subito il feed giusto invece di
// dover cercare l'indirizzo del sito a mano. Non è un motore di ricerca
// generico sul web: copre solo le fonti che l'app già conosce e ha
// verificato (vedi storage.js e curatedFeeds.js) — se una testata non è
// nell'elenco, resta comunque possibile aggiungerla incollando il suo
// indirizzo, come sempre.
import { DEFAULT_FEEDS } from "./storage";
import { CURATED_PACKS } from "./curatedFeeds";

function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildIndex() {
  const byUrl = new Map();
  for (const f of DEFAULT_FEEDS) {
    if (!f.label) continue;
    byUrl.set(f.url, { id: f.id, label: f.label, url: f.url });
  }
  for (const pack of CURATED_PACKS) {
    for (const f of pack.feeds) {
      if (!f.label || byUrl.has(f.url)) continue;
      byUrl.set(f.url, { id: f.id, label: f.label, url: f.url });
    }
  }
  return Array.from(byUrl.values()).map((entry) => ({ ...entry, normalizedLabel: normalize(entry.label) }));
}

let INDEX = null;
function getIndex() {
  if (!INDEX) INDEX = buildIndex();
  return INDEX;
}

// Match testata->query in entrambi i sensi: "resto del carlino" trova
// "Il Resto del Carlino" (label contiene query) e "theguardian.com" trova
// "The Guardian" (query, es. un dominio incollato, contiene la label) —
// utile a chi digita l'indirizzo del sito invece del nome della testata.
export function searchPublishers(query, { limit = 5 } = {}) {
  const q = normalize(query);
  if (q.length < 2) return [];
  const scored = [];
  for (const entry of getIndex()) {
    const { normalizedLabel } = entry;
    let score = -1;
    if (normalizedLabel === q) score = 0;
    else if (normalizedLabel.startsWith(q)) score = 1;
    else if (normalizedLabel.includes(q)) score = 2;
    else if (normalizedLabel.length >= 4 && q.length > normalizedLabel.length && q.includes(normalizedLabel)) score = 3;
    if (score >= 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => a.score - b.score || a.entry.label.length - b.entry.label.length);
  return scored.slice(0, limit).map((s) => s.entry);
}
