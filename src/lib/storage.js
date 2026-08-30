const FEEDS_KEY = "aldusrss.feeds";
const CACHE_KEY = "aldusrss.cache";
const HIDDEN_SECTIONS_KEY = "aldusrss.hiddenSections";
const SECTION_ORDER_KEY = "aldusrss.sectionOrder";
const DARK_MODE_KEY = "aldusrss.darkMode";
const LANGUAGE_KEY = "aldusrss.language";

// Solo fonti italiane nei default: il pubblico principale resta quello
// italiano (issue #7). Chi vuole fonti in inglese le trova come pacchetto
// curato opt-in (curatedFeeds.js, "Fonti in inglese") — l'aggregazione
// multilingua (assignSection con keyword IT+EN+ES in sections.js) le
// classifica comunque per sezione come le fonti italiane, non solo in
// Attualità. Un pacchetto "Fonti in spagnolo" pronto esiste già in
// curatedFeeds.js (SPANISH_PACK_DISABLED) ma non è offerto per ora
// (richiesto dall'utente): l'app si rivolge solo a chi legge IT/EN finché
// non si deciderà di aprire anche allo spagnolo.
// Gazzetta dello Sport sostituita da Sky Sport come fonte sportiva di
// default: verificato (curl, agosto 2026) che https://www.gazzetta.it/rss/*
// è di fatto abbandonato lato editore — tutte le varianti provate servono
// contenuti fermi al 2023/2024 nonostante header di cache "freschi" — mentre
// sport.sky.it/rss/sport.xml è realmente aggiornato in giornata e porta
// immagini.
//
// `sectionHint`: solo per fonti *davvero* a tema unico, che quasi mai
// taggano l'articolo con una categoria riconoscibile (Sky Sport lascia
// <category> vuota; i titoli usano nomi di squadre/competizioni, non parole
// come "calcio") — senza un ripiego finivano quasi tutte nella sezione di
// default (Attualità), monopolizzandola. Vedi `assignSection` in
// classify.js: usato solo quando nessuna parola chiave ha già trovato un
// match reale altrove.
//
// HDblog.it tolta dai default (resta comunque nel pacchetto curato
// Tecnologia, vedi curatedFeeds.js, per chi la vuole comunque). Aveva
// inizialmente NESSUN hint proprio perché pubblica anche contenuto
// generalista non tech (es. "Bollette e caro vita") — ma verificato con le
// categorie reali del feed (agosto 2026, campione di 12 articoli): la
// maggioranza usa categorie generiche tipo "Amazon"/"Auto"/"Domotica"/
// "Curiosità" che non matchano nessuna keyword, quindi ricadeva comunque in
// Attualità anche per contenuto chiaramente tech (gadget, elettronica di
// consumo) — la sezione Tecnologia finiva per svuotarsi di HDblog quasi del
// tutto, mentre Attualità si riempiva di notizie di gadget invece che di
// vera cronaca generalista (segnalato dall'utente). Ora ha comunque
// l'hint: un'occasionale notizia davvero generalista finita in Tecnologia
// per errore pesa meno di questo. DDay.it resta comunque a tema più
// omogeneo, l'hint lì non è mai stato in discussione.
// `label`: nome pulito da mostrare (kicker, elenco Feed) al posto del
// <title> dichiarato dal feed stesso — spesso più verboso di quanto serva
// in UI (es. DDay.it si dichiara "DDay.it, news, articoli, guide, gallery
// e video", ANSA Economia "RSS di Economia - ANSA.it"). Preferito a
// `feedMeta.title` quando presente, vedi App.jsx.
//
// Wired Italia tolta dai default: il suo feed resta cronicamente indietro
// di settimane lato editore (segnalato più volte dall'utente testando),
// mostrando sempre l'avviso "raggiungibile ma senza notizie recenti
// pubblicate" nella scheda Feed. Resta comunque nel pacchetto curato
// Tecnologia per chi la vuole comunque (curatedFeeds.js).
export const DEFAULT_FEEDS = [
  { id: "ansa", url: "https://www.ansa.it/sito/ansait_rss.xml", enabled: true, weight: 1, label: "ANSA" },
  // Peso ridotto di default: pubblica molto più spesso delle altre fonti
  // (anche più volte ogni 10 minuti), quindi in un ranking a sola recency
  // vince quasi sempre il turno anche con notizie sportive minori (es. le
  // maglie della prossima stagione), monopolizzando hero e "in breve" di
  // Prima Pagina a scapito di notizie generaliste più rilevanti ma meno
  // frequenti. Il peso resta modificabile dall'utente in "Feed".
  { id: "sky-sport", url: "https://sport.sky.it/rss/sport.xml", enabled: true, weight: 0.5, sectionHint: "sport", label: "Sky Sport" },
  { id: "ansa-economia", url: "https://www.ansa.it/sito/notizie/economia/economia_rss.xml", enabled: true, weight: 1, sectionHint: "economia", label: "ANSA Economia" },
  { id: "ansa-cultura", url: "https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml", enabled: true, weight: 1, sectionHint: "cultura", label: "ANSA Cultura" },
  { id: "dday", url: "https://www.dday.it/rss", enabled: true, weight: 1, sectionHint: "tecnologia", label: "DDay.it" },
  { id: "sole24ore-economia", url: "https://www.ilsole24ore.com/rss/economia.xml", enabled: true, weight: 1, sectionHint: "economia", label: "Il Sole 24 Ore" },
  // Categorie native ricche e affidabili (Cronaca, Borsa italiana, Cinema e
  // serie tv...): quasi mai deve ripiegare sul titolo, si classifica bene da
  // sola senza hint.
  { id: "rainews", url: "https://www.rainews.it/rss/tutti", enabled: true, weight: 1, label: "RaiNews" },
  // Stesso editore e stesso pattern di pubblicazione di Sky Sport (più volte
  // ogni 10 minuti, quasi mai categorie sull'articolo): peso ridotto di
  // default per lo stesso motivo, prima ancora di vederlo monopolizzare
  // Attualità come già successo con Sky Sport in Prima Pagina.
  { id: "sky-tg24", url: "https://tg24.sky.it/rss/tg24_all.xml", enabled: true, weight: 0.5, label: "Sky TG24" },
  // Testate generaliste maggiori aggiunte ai default (richiesto
  // dall'utente): Corriere della Sera esclusa, il suo feed è di fatto morto
  // lato editore (verificato più volte). Tutte verificate via curl (dirette
  // e attraverso il proxy CORS, senza redirect che spezza il CORS in
  // browser come successo con Everyeye/ANN) e con pubDate recente, agosto
  // 2026. Rimosse dal pacchetto curato "Attualità" (ora ridondante, erano
  // già queste tre) — vedi curatedFeeds.js.
  { id: "la-repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", enabled: true, weight: 1, label: "La Repubblica" },
  { id: "il-fatto-quotidiano", url: "https://www.ilfattoquotidiano.it/feed/", enabled: true, weight: 1, label: "Il Fatto Quotidiano" },
  { id: "il-messaggero", url: "https://www.ilmessaggero.it/rss/home.xml", enabled: true, weight: 1, label: "Il Messaggero" },
  // Agenzia di stampa (come ANSA): titoli asciutti, cronaca pura, quasi mai
  // opinione — un buon contrappeso alle testate sopra.
  { id: "agi", url: "https://www.agi.it/cronaca/rss", enabled: true, weight: 1, label: "AGI" },
  { id: "open", url: "https://www.open.online/feed/", enabled: true, weight: 1, label: "Open" },
  // Peso ridotto come Sky Sport/Sky TG24: pubblica più volte ogni 10 minuti
  // (verificato, stesso motivo di monopolio potenziale su Prima Pagina).
  { id: "tgcom24", url: "https://www.tgcom24.mediaset.it/rss/", enabled: true, weight: 0.5, label: "TGCOM24" },
];

export function loadFeedList() {
  try {
    const raw = localStorage.getItem(FEEDS_KEY);
    if (!raw) return DEFAULT_FEEDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_FEEDS;
  } catch {
    return DEFAULT_FEEDS;
  }
}

export function saveFeedList(list) {
  try {
    localStorage.setItem(FEEDS_KEY, JSON.stringify(list));
  } catch {
    // localStorage non disponibile (modalità privata, quota piena, ecc.)
  }
}

export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSourceCache(id, data) {
  try {
    const cache = loadCache();
    cache[id] = { ...data, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignora: la cache è solo un fallback, non è critica
  }
}

export function removeSourceCache(id) {
  try {
    const cache = loadCache();
    delete cache[id];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignora
  }
}

// Usata dal pulsante "Svuota cache" in Impostazioni: rimuove tutti gli
// articoli salvati (forza un refresh completo da zero) senza toccare
// l'elenco dei feed dell'utente, le preferenze o l'ordine delle sezioni.
export function clearAllSourceCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignora
  }
}

export function loadHiddenSections() {
  try {
    const raw = localStorage.getItem(HIDDEN_SECTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHiddenSections(hiddenIds) {
  try {
    localStorage.setItem(HIDDEN_SECTIONS_KEY, JSON.stringify(hiddenIds));
  } catch {
    // ignora
  }
}

// null = nessuna preferenza salvata, usa l'ordine di default di sections.js.
export function loadSectionOrderPref() {
  try {
    const raw = localStorage.getItem(SECTION_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSectionOrderPref(order) {
  try {
    localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(order));
  } catch {
    // ignora
  }
}

// Rispetta la preferenza di sistema finché l'utente non sceglie esplicitamente,
// poi ricorda la scelta.
export function loadDarkMode() {
  try {
    const raw = localStorage.getItem(DARK_MODE_KEY);
    if (raw !== null) return raw === "true";
  } catch {
    // ignora
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function saveDarkMode(value) {
  try {
    localStorage.setItem(DARK_MODE_KEY, String(value));
  } catch {
    // ignora
  }
}

// "auto" (default) = segue la lingua del browser; "it"/"en" = scelta esplicita.
export function loadLanguagePref() {
  try {
    return localStorage.getItem(LANGUAGE_KEY) || "auto";
  } catch {
    return "auto";
  }
}

export function saveLanguagePref(value) {
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {
    // ignora
  }
}
