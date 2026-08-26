import { SECTIONS, DEFAULT_SECTION_ID } from "./sections";

// Le categorie native del feed (quando presenti) sono un segnale molto più
// affidabile di qualunque euristica sul titolo: un feed che tagga un articolo
// "Calcio" sa già di cosa parla. Il titolo è solo un fallback per i feed senza
// categorie.
const CATEGORY_WEIGHT = 3;
const TITLE_WEIGHT = 1;

export function assignSection(article) {
  const categoryText = ` ${(article.categories || []).join(" ").toLowerCase()} `;
  const hasCategories = categoryText.trim().length > 0;
  const titleText = ` ${(article.title || "").toLowerCase()} `;

  let best = DEFAULT_SECTION_ID;
  let bestScore = 0;
  for (const section of Object.values(SECTIONS)) {
    if (section.id === DEFAULT_SECTION_ID) continue;
    const catScore = section.keywords.reduce((n, w) => n + (categoryText.includes(w) ? 1 : 0), 0);
    const titleScore = hasCategories ? 0 : section.keywords.reduce((n, w) => n + (titleText.includes(w) ? 1 : 0), 0);
    const score = catScore * CATEGORY_WEIGHT + titleScore * TITLE_WEIGHT;
    if (score > bestScore) {
      bestScore = score;
      best = section.id;
    }
  }
  return best;
}

// Non è un vero ranking editoriale (l'"importanza" di una notizia resta
// indecidibile in automatico): è recency con decadimento esponenziale,
// moltiplicata per il peso che l'utente assegna alla fonte in "Feed".
const RECENCY_HALF_LIFE_HOURS = 8;

export function scoreArticle(article, sourceWeight = 1) {
  const t = Date.parse(article.pubDate);
  const ageHours = Number.isNaN(t) ? 999 : Math.max(0, (Date.now() - t) / 3600000);
  const recency = Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
  return recency * sourceWeight;
}

function bucketArticles(sorted) {
  if (sorted.length === 0) return { hero: null, secondary: [], brief: [] };
  const withImage = sorted.filter((a) => a.image);
  const hero = withImage[0] || sorted[0];
  const rest = sorted.filter((a) => a.id !== hero.id);
  const secondary = rest.filter((a) => a.image).slice(0, 3);
  const secondaryIds = new Set(secondary.map((a) => a.id));
  const brief = rest.filter((a) => !secondaryIds.has(a.id)).slice(0, 6);
  return { hero, secondary, brief };
}

export function composeArticles(articles, sourceWeights = {}) {
  const sorted = [...articles].sort(
    (a, b) => scoreArticle(b, sourceWeights[b.sourceId] ?? 1) - scoreArticle(a, sourceWeights[a.sourceId] ?? 1)
  );
  return bucketArticles(sorted);
}
