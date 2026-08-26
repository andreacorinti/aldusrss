const FEEDS_KEY = "aldusrss.feeds";
const CACHE_KEY = "aldusrss.cache";
const HIDDEN_SECTIONS_KEY = "aldusrss.hiddenSections";

export const DEFAULT_FEEDS = [
  { id: "ansa", url: "https://www.ansa.it/sito/ansait_rss.xml", enabled: true, weight: 1 },
  { id: "wired", url: "https://www.wired.it/feed/rss", enabled: true, weight: 1 },
  { id: "gazzetta", url: "https://www.gazzetta.it/rss/home.xml", enabled: true, weight: 1 },
  // Fonte in inglese di test, per verificare l'aggregazione multilingua: il
  // classico feed pubblico di AP (apnews.com/apf-topnews) non risponde più
  // (redirect morto), BBC News è affidabile e porta categorie utilizzabili.
  { id: "bbc", url: "https://feeds.bbci.co.uk/news/rss.xml", enabled: true, weight: 1 },
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
