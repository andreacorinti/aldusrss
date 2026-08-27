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

// Il decadimento esponenziale da solo ordina ma non scarta mai: se un feed
// non pubblica articoli con immagine da giorni, un pezzo vecchio di mesi può
// comunque finire in hero solo perché è l'unico "con immagine" disponibile in
// quel momento. La finestra di freschezza pone un limite: entro qualche
// giorno un articolo importante (peso fonte alto, o semplicemente il più
// recente disponibile) resta in cima grazie al punteggio; oltre, viene escluso
// da hero/secondaria — a meno che davvero non ci sia nulla di più fresco,
// nel qual caso si ripiega sul più recente disponibile piuttosto che
// mostrare una sezione vuota (con un avviso, vedi App.jsx).
const FRESH_WINDOW_HOURS = 5 * 24;

function isFresh(article) {
  const t = Date.parse(article.pubDate);
  if (Number.isNaN(t)) return false;
  return (Date.now() - t) / 3600000 <= FRESH_WINDOW_HOURS;
}

// `diversify` limita quante ne può piazzare una singola fonte: senza, una
// fonte molto prolifica (tante uscite, quasi sempre classificate nella
// sezione di default perché non porta categorie — è il caso di ANSA) può
// monopolizzare non solo hero+secondaria ma perfino "in breve", rendendo
// Prima Pagina indistinguibile dalla sezione generalista (visto e verificato:
// stesso hero, stessi 6 "in breve"). Il tetto è più permissivo in "in breve"
// (un riepilogo tollera un po' più di ripetizione) che in hero+secondaria
// (dove una singola fonte non dovrebbe mai occupare la vetrina). Ha senso
// solo per Prima Pagina: dentro una singola sezione tematica è normale —
// anzi atteso — che più articoli della stessa fonte compaiano insieme.
const BRIEF_MAX_PER_SOURCE = 2;

function bucketArticles(sorted, { diversify = false } = {}) {
  if (sorted.length === 0) return { hero: null, secondary: [], brief: [], stale: false };

  const fresh = sorted.filter(isFresh);
  const stale = fresh.length === 0;

  // Con `diversify` (Prima Pagina) filtrare l'intero pool sul solo fresco
  // prima di diversificare per fonte finiva per escludere del tutto una
  // fonte meno "rumorosa" (poche uscite ma non nell'ultima finestra) quando
  // un'altra fonte molto attiva aveva già riempito il fresco disponibile —
  // la diversificazione restava senza nient'altro da cui pescare. Qui invece
  // il fresco viene semplicemente anteposto al resto (stesso ordine di
  // punteggio all'interno di ciascun gruppo): hero/secondaria/in-breve
  // pescano quindi prima dal fresco e, fonte per fonte, solo se necessario
  // completano con il meglio disponibile di quella fonte anche se meno
  // recente — non sparisce mai del tutto.
  const notFresh = sorted.filter((a) => !isFresh(a));
  const pool = diversify ? [...fresh, ...notFresh] : fresh.length > 0 ? fresh : sorted;

  const withImage = pool.filter((a) => a.image);
  const hero = withImage[0] || pool[0];
  const rest = pool.filter((a) => a.id !== hero.id);

  const sourceCounts = new Map([[hero.sourceId, 1]]);
  const secondary = [];
  for (const a of rest) {
    if (secondary.length >= 3) break;
    if (!a.image) continue;
    if (diversify && sourceCounts.has(a.sourceId)) continue;
    secondary.push(a);
    sourceCounts.set(a.sourceId, (sourceCounts.get(a.sourceId) || 0) + 1);
  }

  const secondaryIds = new Set(secondary.map((a) => a.id));
  const briefCandidates = rest.filter((a) => !secondaryIds.has(a.id));
  const brief = [];
  for (const a of briefCandidates) {
    if (brief.length >= 6) break;
    if (diversify) {
      const count = sourceCounts.get(a.sourceId) || 0;
      if (count >= BRIEF_MAX_PER_SOURCE) continue;
      sourceCounts.set(a.sourceId, count + 1);
    }
    brief.push(a);
  }

  return { hero, secondary, brief, stale };
}

export function composeArticles(articles, sourceWeights = {}, options = {}) {
  const sorted = [...articles].sort(
    (a, b) => scoreArticle(b, sourceWeights[b.sourceId] ?? 1) - scoreArticle(a, sourceWeights[a.sourceId] ?? 1)
  );
  return bucketArticles(sorted, options);
}
