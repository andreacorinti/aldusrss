import { SECTIONS, DEFAULT_SECTION_ID } from "./sections";
import { parseDate } from "./format";

// Le categorie native del feed (quando presenti) sono un segnale molto più
// affidabile di qualunque euristica sul titolo: un feed che tagga un articolo
// "Calcio" sa già di cosa parla. Il titolo è solo un fallback per i feed senza
// categorie.
const CATEGORY_WEIGHT = 3;
const TITLE_WEIGHT = 1;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Confine di parola invece di un `includes()` su tutta la stringa: parole
// chiave brevi come "arte" comparivano come sottostringa dentro parole
// italiane comuni e del tutto estranee (es. "partecipanti" contiene "arte"),
// producendo classificazioni sbagliate senza che nessuna vera parola chiave
// fosse presente nel testo.
function compileKeywords(keywords) {
  return keywords.map((w) => new RegExp(`\\b${escapeRegExp(w.trim())}\\b`, "i"));
}

const SECTION_MATCHERS = Object.values(SECTIONS)
  .filter((section) => section.id !== DEFAULT_SECTION_ID)
  .map((section) => ({ id: section.id, regexes: compileKeywords(section.keywords) }));

// `sectionHint` è la sezione "di casa" di una fonte a tema unico (es. Sky
// Sport → sport): usata solo come ripiego quando nessuna parola chiave ha
// trovato corrispondenza, mai per scavalcare un match reale. Molte fonti
// specializzate non taggano ogni articolo con una categoria riconoscibile
// (Sky Sport lascia quasi sempre <category> vuota) né usano nel titolo le
// parole chiave attese (nomi di squadre/competizioni, non "calcio"): senza
// un ripiego, quegli articoli cadevano tutti nella sezione di default
// (Attualità), finendo per monopolizzarla.
export function assignSection(article, sectionHint) {
  const categoryText = (article.categories || []).join(" ").toLowerCase();
  const hasCategories = categoryText.trim().length > 0;
  const titleText = (article.title || "").toLowerCase();

  let best = DEFAULT_SECTION_ID;
  let bestScore = 0;
  for (const { id, regexes } of SECTION_MATCHERS) {
    const catScore = regexes.reduce((n, re) => n + (re.test(categoryText) ? 1 : 0), 0);
    const titleScore = hasCategories ? 0 : regexes.reduce((n, re) => n + (re.test(titleText) ? 1 : 0), 0);
    const score = catScore * CATEGORY_WEIGHT + titleScore * TITLE_WEIGHT;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  if (best === DEFAULT_SECTION_ID && sectionHint && SECTIONS[sectionHint]) return sectionHint;
  return best;
}

// Non è un vero ranking editoriale (l'"importanza" di una notizia resta
// indecidibile in automatico): è recency con decadimento esponenziale,
// moltiplicata per il peso che l'utente assegna alla fonte in "Feed".
const RECENCY_HALF_LIFE_HOURS = 8;

export function scoreArticle(article, sourceWeight = 1) {
  const t = parseDate(article.pubDate);
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

export function isFresh(article) {
  const t = parseDate(article.pubDate);
  if (Number.isNaN(t)) return false;
  return (Date.now() - t) / 3600000 <= FRESH_WINDOW_HOURS;
}

// `diversify` limita quante ne può piazzare una singola fonte: senza, una
// fonte molto prolifica può monopolizzare non solo hero+secondaria ma
// perfino "in breve", rendendo Prima Pagina indistinguibile dalla sezione
// generalista di quella fonte (visto e verificato con più fonti diverse: ANSA
// quando non porta categorie, poi Sky Sport che pubblica più volte ogni 10
// minuti). Un tetto di 1 anche per "in breve" (prima erano 2) tiene Prima
// Pagina più rappresentativa dell'insieme delle fonti invece che dominata
// da chi semplicemente pubblica più spesso — con più fonti di default che in
// passato, 2 su 6 voci di un riepilogo di 6 pesava troppo. Ha senso solo per
// Prima Pagina: dentro una singola sezione tematica è normale — anzi atteso
// — che più articoli della stessa fonte compaiano insieme.
const BRIEF_MAX_PER_SOURCE = 1;

function bucketArticles(sorted, { diversify = false } = {}) {
  if (sorted.length === 0) return { hero: null, secondary: [], brief: [], stale: false };

  const fresh = sorted.filter(isFresh);

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

  // L'hero è semplicemente il più rilevante del pool (punteggio più alto),
  // immagine o no: richiederla escludeva strutturalmente fonti serie che
  // semplicemente non ne pubblicano (ANSA, Il Fatto Quotidiano) da hero e
  // secondaria in OGNI sezione, qualunque fosse il loro peso — chi aveva la
  // priorità più alta ma nessuna immagine perdeva comunque contro una fonte
  // meno prioritaria ma "fotografata" (verificato: Il Fatto Quotidiano con
  // peso Alto restava sempre in "in breve"). La vista mostra comunque
  // un'immagine (placeholder) per ogni hero, vera o no, quindi la resa
  // visiva non cambia — solo cosa vince in base al punteggio reale.
  const hero = pool[0];
  const rest = pool.filter((a) => a.id !== hero.id);

  // A differenza del pool (dove il ripiego sul non-fresco serve a non far
  // sparire del tutto una fonte "quiet"), la vetrina di Prima Pagina
  // (hero+secondaria) non deve mai mostrare un pezzo vecchio solo perché è
  // rimasta l'unica fonte-con-immagine non ancora usata dal tetto per fonte:
  // meglio una riga più corta che una notizia di settimane fa in prima fila.
  // "In breve" resta più permissivo (vedi sopra).
  const freshIds = new Set(fresh.map((a) => a.id));
  const sourceCounts = new Map([[hero.sourceId, 1]]);
  const secondary = [];
  for (const a of rest) {
    if (secondary.length >= 3) break;
    if (!a.image) continue;
    if (diversify && !freshIds.has(a.id)) continue;
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

  // Riferito all'hero effettivamente mostrato, non a "esiste un fresco da
  // qualche parte nel pool": con `diversify` una fonte può restare fresca
  // (es. ANSA) ma senza immagini, e l'hero (che le richiede) ripiegare
  // comunque su un pezzo vecchio di un'altra fonte — l'avviso deve riflettere
  // quello che l'utente vede in cima, non lo stato generico della sezione.
  return { hero, secondary, brief, stale: !isFresh(hero) };
}

export function composeArticles(articles, sourceWeights = {}, options = {}) {
  const sorted = [...articles].sort(
    (a, b) => scoreArticle(b, sourceWeights[b.sourceId] ?? 1) - scoreArticle(a, sourceWeights[a.sourceId] ?? 1)
  );
  return bucketArticles(sorted, options);
}
