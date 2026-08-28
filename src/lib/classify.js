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

// Solo per Prima Pagina (mai per la sezione stessa, dove sarebbe sbagliato:
// Sport deve ovviamente restare guidata dallo sport). Senza, la prima
// notizia in evidenza finiva a tema sportivo/tech ogni volta che quella
// fonte pubblicava qualcosa di anche solo un po' più fresco dell'ultima
// notizia generalista — cosa comune, essendo Sky Sport/HDblog molto
// prolifici — mentre in un vero giornale la notizia di apertura è quasi
// sempre di cronaca/attualità, salvo eventi eccezionali (finali, guerre,
// crolli di mercato). Il fattore non esclude mai lo sport dalla vetrina,
// lo rende semplicemente competitivo solo quando è nettamente più fresco
// della cronaca del momento, non alla pari.
const FRONT_PAGE_SECTION_FACTOR = {
  attualita: 1,
  economia: 0.85,
  sport: 0.5,
  tecnologia: 0.55,
  cultura: 0.55,
};

export function scoreArticle(article, sourceWeight = 1, { frontPage = false } = {}) {
  const t = parseDate(article.pubDate);
  const ageHours = Number.isNaN(t) ? 999 : Math.max(0, (Date.now() - t) / 3600000);
  const recency = Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
  const sectionFactor = frontPage ? (FRONT_PAGE_SECTION_FACTOR[article.section] ?? 1) : 1;
  return recency * sourceWeight * sectionFactor;
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

// `diversify` limita quante ne può piazzare una singola fonte in totale
// (hero+secondaria+in breve insieme): senza, una fonte molto prolifica può
// monopolizzare Prima Pagina, rendendola indistinguibile dalla sezione
// generalista di quella fonte (visto e verificato con più fonti diverse:
// ANSA quando non porta categorie, poi Sky Sport che pubblica più volte
// ogni 10 minuti).
const MAX_PER_SOURCE_FRONT_PAGE = 2;

// Stesso principio, ma per sezione tematica invece che per fonte: senza,
// la vetrina di Prima Pagina finiva per assomigliare troppo alla sola
// sezione più numerosa (quasi sempre Attualità, la sezione di fallback per
// chi non ha una categoria specifica), perché il punteggio da solo premia
// naturalmente chi pubblica di più — non chi rappresenta meglio le diverse
// rubriche di un giornale vero (segnalato dall'utente dopo il primo giro
// di test). Vedi il "primo giro" qui sotto in `bucketArticles`.
const MAX_PER_SECTION_FRONT_PAGE = 3;

// Fuori da Prima Pagina un tetto per fonte ha comunque senso — stesso
// problema di monopolio, stavolta dentro la singola sezione tematica invece
// che nella vetrina — MA solo se quella sezione è alimentata da più fonti
// distinte: con una sola fonte (es. Sport finché l'unica fonte sportiva
// abilitata è Sky Sport) il tetto ridurrebbe artificialmente quanto viene
// mostrato senza alcun beneficio di varietà, dato che non c'è nient'altro
// da cui pescare.
const MAX_PER_SOURCE_SECTION = 4;

// Solo per le sezioni tematiche (mai per Prima Pagina stessa): l'apertura di
// una sezione che ripete parola per parola l'apertura di Prima Pagina la fa
// sembrare un doppione invece di una rubrica con una propria identità
// (segnalato dall'utente). L'articolo resta comunque eleggibile per
// secondaria/in breve in quella sezione — viene solo scavalcato per l'hero,
// non tolto dal tutto: è ancora la notizia migliore di quella sezione, va
// comunque mostrata, solo non due volte "in prima fila".
function bucketArticles(sorted, { diversify = false, excludeHeroIds } = {}) {
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
  // Sceglie il primo del pool che non sia già l'hero di Prima Pagina: se
  // proprio non c'è altro (la sezione ha un solo pezzo disponibile, ed è
  // quello) ripiega comunque su di lui, una sezione vuota sarebbe peggio.
  const heroIdx = excludeHeroIds ? pool.findIndex((a) => !excludeHeroIds.has(a.id)) : 0;
  const hero = pool[heroIdx === -1 ? 0 : heroIdx];
  const rest = pool.filter((a) => a.id !== hero.id);

  // A differenza del pool (dove il ripiego sul non-fresco serve a non far
  // sparire del tutto una fonte "quiet"), la vetrina di Prima Pagina
  // (hero+secondaria) non deve mai mostrare un pezzo vecchio solo perché è
  // rimasta l'unica fonte-con-immagine non ancora usata dal tetto per fonte:
  // meglio una riga più corta che una notizia di settimane fa in prima fila.
  // "In breve" resta più permissivo (vedi sopra).
  const freshIds = new Set(fresh.map((a) => a.id));

  // Fuori da Prima Pagina il tetto per fonte si applica solo se la sezione
  // ha davvero più fonti tra cui scegliere (vedi MAX_PER_SOURCE_SECTION).
  const distinctSources = new Set(pool.map((a) => a.sourceId)).size;
  const applySourceCap = diversify || distinctSources > 1;
  const sourceCap = diversify ? MAX_PER_SOURCE_FRONT_PAGE : MAX_PER_SOURCE_SECTION;

  const sourceCounts = new Map([[hero.sourceId, 1]]);
  const sectionCounts = new Map([[hero.section, 1]]);
  const secondary = [];
  const brief = [];

  // Piazza un pezzo "garantito" (primo giro, sotto) in secondaria se ha
  // un'immagine e c'è posto, altrimenti in breve — mai perso solo perché
  // capitava di non avere una foto. Ritorna false se non c'è più posto da
  // nessuna parte.
  function placeGuaranteed(a) {
    if (a.image && secondary.length < 3) secondary.push(a);
    else if (brief.length < 6) brief.push(a);
    else return false;
    sourceCounts.set(a.sourceId, (sourceCounts.get(a.sourceId) || 0) + 1);
    sectionCounts.set(a.section, (sectionCounts.get(a.section) || 0) + 1);
    return true;
  }

  // Primo giro (solo Prima Pagina): prende il pezzo migliore di ogni sezione
  // diversa da quella dell'hero, come farebbe un caporedattore che spartisce
  // lo spazio in prima pagina tra le rubriche — invece di lasciare che il
  // solo punteggio (che premia naturalmente la sezione più prolifica, quasi
  // sempre Attualità) riempia la vetrina con un'unica sezione. Rispetta
  // comunque il tetto per fonte: senza, una fonte molto prolifica che vince
  // il punteggio più alto in più sezioni diverse (capitato con The Guardian,
  // che pubblica spesso) tornava a monopolizzare la vetrina esattamente come
  // prima, solo "mascherata" da sezioni diverse invece che dalla stessa.
  if (diversify) {
    const sectionsSeen = new Set([hero.section]);
    for (const a of rest) {
      if (secondary.length >= 3) break;
      if (!a.image) continue;
      if (!freshIds.has(a.id)) continue;
      if (sectionsSeen.has(a.section)) continue;
      if (applySourceCap && (sourceCounts.get(a.sourceId) || 0) >= sourceCap) continue;
      secondary.push(a);
      sectionsSeen.add(a.section);
      sourceCounts.set(a.sourceId, (sourceCounts.get(a.sourceId) || 0) + 1);
      sectionCounts.set(a.section, (sectionCounts.get(a.section) || 0) + 1);
    }
  }

  // Primo giro (fuori da Prima Pagina, dentro una singola sezione): garantisce
  // un pezzo per ogni fonte distinta che ha qualcosa di fresco da mostrare,
  // prima di lasciare che il punteggio (che premia chi pubblica di più) la
  // faccia sparire del tutto dietro a una fonte più prolifica — anche se
  // resta sotto il tetto massimo, una fonte che pubblica raramente perdeva
  // comunque ogni "gara" punto per punto contro chi pubblica spesso.
  // A differenza del tetto (§MAX_PER_SOURCE_SECTION), può finire sia in
  // secondaria che in breve: con più di 3 fonti distinte, la sola secondaria
  // non basterebbe a garantirle tutte.
  if (!diversify) {
    const sourcesSeen = new Set([hero.sourceId]);
    for (const a of rest) {
      if (secondary.length >= 3 && brief.length >= 6) break;
      if (!freshIds.has(a.id)) continue;
      if (sourcesSeen.has(a.sourceId)) continue;
      if (!placeGuaranteed(a)) continue;
      sourcesSeen.add(a.sourceId);
    }
  }

  // Secondo giro: riempie gli slot rimasti per punteggio, rispettando il
  // tetto per fonte (sempre, quando applicabile) e per sezione (solo Prima
  // Pagina — dentro una singola sezione tematica è normale che più articoli
  // condividano la stessa sezione, è letteralmente la sezione aperta).
  const secondaryIds = new Set(secondary.map((a) => a.id));
  for (const a of rest) {
    if (secondary.length >= 3) break;
    if (secondaryIds.has(a.id)) continue;
    if (!a.image) continue;
    if (diversify && !freshIds.has(a.id)) continue;
    if (applySourceCap && (sourceCounts.get(a.sourceId) || 0) >= sourceCap) continue;
    if (diversify && (sectionCounts.get(a.section) || 0) >= MAX_PER_SECTION_FRONT_PAGE) continue;
    secondary.push(a);
    secondaryIds.add(a.id);
    sourceCounts.set(a.sourceId, (sourceCounts.get(a.sourceId) || 0) + 1);
    sectionCounts.set(a.section, (sectionCounts.get(a.section) || 0) + 1);
  }

  const briefIds = new Set(brief.map((a) => a.id));
  const briefCandidates = rest.filter((a) => !secondaryIds.has(a.id) && !briefIds.has(a.id));
  for (const a of briefCandidates) {
    if (brief.length >= 6) break;
    if (applySourceCap && (sourceCounts.get(a.sourceId) || 0) >= sourceCap) continue;
    if (diversify && (sectionCounts.get(a.section) || 0) >= MAX_PER_SECTION_FRONT_PAGE) continue;
    sourceCounts.set(a.sourceId, (sourceCounts.get(a.sourceId) || 0) + 1);
    sectionCounts.set(a.section, (sectionCounts.get(a.section) || 0) + 1);
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
  const scoreOpts = { frontPage: !!options.diversify };
  const sorted = [...articles].sort(
    (a, b) =>
      scoreArticle(b, sourceWeights[b.sourceId] ?? 1, scoreOpts) - scoreArticle(a, sourceWeights[a.sourceId] ?? 1, scoreOpts)
  );
  return bucketArticles(sorted, options);
}
