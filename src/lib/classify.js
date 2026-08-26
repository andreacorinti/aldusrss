import { DEFAULT_TEMPLATE_ID } from "./templates";

const KEYWORDS = {
  sportivo: ["sport", "calcio", "tennis", "basket", "volley", "ciclismo", "formula 1", "nba", "serie a", "motogp", "pallavolo", "rugby", "golf", "nuoto", "olimpiadi", "gazzetta"],
  magazine: ["tecnologia", "tech", "smartphone", "intelligenza artificiale", " ai ", "gadget", "software", "hardware", "app", "videogiochi", "gaming", "scienza", "innovazione", "digitale", "wired"],
};

// Un match nel titolo della fonte è un segnale forte (es. "Wired Italia", "Gazzetta.it").
// Un match nella sola descrizione è debole: molte testate generaliste elencano "sport" o
// "tecnologia" tra le tante rubriche in descrizione senza essere fonti specializzate, quindi
// da solo non basta a scavalcare il template generalista di default.
const TITLE_WEIGHT = 2;
const DESCRIPTION_WEIGHT = 1;
const MIN_SCORE = 2;

export function assignTemplate(feedMeta) {
  const title = ` ${(feedMeta.title || "").toLowerCase()} `;
  const description = ` ${(feedMeta.description || "").toLowerCase()} `;
  let best = null;
  let bestScore = 0;
  for (const [templateId, words] of Object.entries(KEYWORDS)) {
    const score = words.reduce((n, w) => {
      const inTitle = title.includes(w) ? TITLE_WEIGHT : 0;
      const inDescription = description.includes(w) ? DESCRIPTION_WEIGHT : 0;
      return n + inTitle + inDescription;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = templateId;
    }
  }
  return bestScore >= MIN_SCORE ? best : DEFAULT_TEMPLATE_ID;
}

export function classifyArticles(articles) {
  const sorted = [...articles].sort((a, b) => {
    const da = Date.parse(a.pubDate);
    const db = Date.parse(b.pubDate);
    return (Number.isNaN(db) ? 0 : db) - (Number.isNaN(da) ? 0 : da);
  });
  if (sorted.length === 0) return { hero: null, secondary: [], brief: [] };

  const withImage = sorted.filter((a) => a.image);
  const hero = withImage[0] || sorted[0];
  const rest = sorted.filter((a) => a.id !== hero.id);
  const secondary = rest.filter((a) => a.image).slice(0, 3);
  const secondaryIds = new Set(secondary.map((a) => a.id));
  const brief = rest.filter((a) => !secondaryIds.has(a.id)).slice(0, 6);

  return { hero, secondary, brief };
}
