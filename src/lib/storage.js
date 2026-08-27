const FEEDS_KEY = "aldusrss.feeds";
const CACHE_KEY = "aldusrss.cache";
const HIDDEN_SECTIONS_KEY = "aldusrss.hiddenSections";
const SECTION_ORDER_KEY = "aldusrss.sectionOrder";
const DARK_MODE_KEY = "aldusrss.darkMode";
const LANGUAGE_KEY = "aldusrss.language";

// Solo fonti italiane per ora: la strategia per un pubblico internazionale
// (quali lingue, quali fonti EN) resta da ripensare con calma — vedi issue #9.
// L'aggregazione multilingua (assignSection con keyword IT+EN, selettore
// lingua interfaccia) resta comunque pronta per quando si deciderà.
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
// match reale altrove. HDblog.it (nonostante il nome) pubblica anche
// contenuto generalista non tech (es. "Bollette e caro vita", nessuna
// categoria) — un hint "tecnologia" forzava anche quello dentro Tecnologia.
// Niente hint per lui: si affida al match a parole chiave (categorie tipo
// "Android"/"Motorola", aggiunte a sections.js), lasciando che il resto
// ricada correttamente in Attualità.
export const DEFAULT_FEEDS = [
  { id: "ansa", url: "https://www.ansa.it/sito/ansait_rss.xml", enabled: true, weight: 1 },
  { id: "wired", url: "https://www.wired.it/feed/rss", enabled: true, weight: 1 },
  // Peso ridotto di default: pubblica molto più spesso delle altre fonti
  // (anche più volte ogni 10 minuti), quindi in un ranking a sola recency
  // vince quasi sempre il turno anche con notizie sportive minori (es. le
  // maglie della prossima stagione), monopolizzando hero e "in breve" di
  // Prima Pagina a scapito di notizie generaliste più rilevanti ma meno
  // frequenti. Il peso resta modificabile dall'utente in "Feed".
  { id: "sky-sport", url: "https://sport.sky.it/rss/sport.xml", enabled: true, weight: 0.5, sectionHint: "sport" },
  { id: "ansa-economia", url: "https://www.ansa.it/sito/notizie/economia/economia_rss.xml", enabled: true, weight: 1, sectionHint: "economia" },
  { id: "ansa-cultura", url: "https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml", enabled: true, weight: 1, sectionHint: "cultura" },
  { id: "hdblog", url: "https://www.hdblog.it/rss/", enabled: true, weight: 1 },
  { id: "sole24ore-economia", url: "https://www.ilsole24ore.com/rss/economia.xml", enabled: true, weight: 1, sectionHint: "economia" },
  // Categorie native ricche e affidabili (Cronaca, Borsa italiana, Cinema e
  // serie tv...): quasi mai deve ripiegare sul titolo, si classifica bene da
  // sola senza hint.
  { id: "rainews", url: "https://www.rainews.it/rss/tutti", enabled: true, weight: 1 },
  // Stesso editore e stesso pattern di pubblicazione di Sky Sport (più volte
  // ogni 10 minuti, quasi mai categorie sull'articolo): peso ridotto di
  // default per lo stesso motivo, prima ancora di vederlo monopolizzare
  // Attualità come già successo con Sky Sport in Prima Pagina.
  { id: "sky-tg24", url: "https://tg24.sky.it/rss/tg24_all.xml", enabled: true, weight: 0.5 },
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
