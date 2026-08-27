// Proxy CORS pubblici di fallback, provati in ordine finché uno risponde.
// Nessuno è garantito: sono servizi di terzi best-effort, non un'infrastruttura
// nostra (vedi README, sezione "Limiti noti").
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

const FETCH_TIMEOUT_MS = 6000;

// Un proxy pubblico può restare "appeso" senza rispondere né fallire: senza un
// timeout per tentativo, la catena si blocca sul primo e non arriva mai a
// provare gli altri.
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOk(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Fetch generico con fallback sui proxy CORS: usato sia per scaricare l'XML di
// un feed sia (per l'autodiscovery) per scaricare l'HTML di una pagina.
//
// Diretto + proxy partono tutti insieme invece che in sequenza: provarli uno
// alla volta poteva costare fino a ~18s (6s a tentativo × 3) prima di
// arrendersi, anche quando uno degli altri avrebbe risposto in un secondo.
// Promise.any prende semplicemente il primo che risponde con successo.
export async function fetchTextWithFallback(url) {
  const attempts = [url, ...CORS_PROXIES.map((build) => build(url))];
  try {
    return await Promise.any(attempts.map(fetchOk));
  } catch (err) {
    const reasons = err.errors ? err.errors.map((e) => e.message).join("; ") : err.message;
    throw new Error(`Impossibile scaricare la risorsa: nessuna fonte raggiungibile (${reasons})`);
  }
}

function firstTag(el, names) {
  for (const name of names) {
    const found = el.getElementsByTagName(name)[0];
    if (found && found.textContent && found.textContent.trim()) return found.textContent.trim();
  }
  return "";
}

function extractImage(itemEl, descriptionHtml) {
  const enclosure = itemEl.querySelector("enclosure[url]");
  if (enclosure) {
    const type = enclosure.getAttribute("type") || "";
    if (!type || type.startsWith("image")) {
      const u = enclosure.getAttribute("url");
      if (u) return u;
    }
  }
  // Alcuni feed (es. Wired) dichiarano <media:content/> vuoto (nessun
  // attributo url, l'immagine reale sta in <media:thumbnail>): prendere solo
  // il primo elemento trovato, a prescindere da url, scartava silenziosamente
  // immagini reali disponibili nel tag successivo.
  const mediaEls = [
    ...itemEl.getElementsByTagName("media:content"),
    ...itemEl.getElementsByTagName("media:thumbnail"),
  ];
  for (const media of mediaEls) {
    const u = media.getAttribute("url");
    if (u) return u;
  }
  if (descriptionHtml) {
    const match = descriptionHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) return match[1];
  }
  return null;
}

function parseRss(doc) {
  const channel = doc.querySelector("channel");
  const title = firstTag(channel, ["title"]);
  const description = firstTag(channel, ["description"]);
  const link = firstTag(channel, ["link"]);
  const items = Array.from(channel.querySelectorAll("item"));
  const articles = items.map((item, i) => {
    const description = firstTag(item, ["content:encoded", "description"]);
    const itemTitle = firstTag(item, ["title"]);
    const itemLink = firstTag(item, ["link"]);
    const guid = firstTag(item, ["guid"]) || itemLink || `${itemTitle}-${i}`;
    const categories = Array.from(item.getElementsByTagName("category"))
      .map((c) => c.textContent.trim())
      .filter(Boolean);
    return {
      id: guid,
      title: itemTitle,
      link: itemLink,
      description,
      pubDate: firstTag(item, ["pubDate", "dc:date"]),
      author: firstTag(item, ["author", "dc:creator"]),
      categories,
      image: extractImage(item, description),
    };
  });
  return { title, description, link, articles };
}

function parseAtom(doc) {
  const feedEl = doc.querySelector("feed");
  const title = firstTag(feedEl, ["title"]);
  const description = firstTag(feedEl, ["subtitle"]);
  const feedLinkEl = feedEl.querySelector('link[rel="alternate"]') || feedEl.querySelector("link");
  const link = feedLinkEl ? feedLinkEl.getAttribute("href") : "";
  const entries = Array.from(feedEl.querySelectorAll("entry"));
  const articles = entries.map((entry, i) => {
    const entryTitle = firstTag(entry, ["title"]);
    const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector("link");
    const entryLink = linkEl ? linkEl.getAttribute("href") : "";
    const description = firstTag(entry, ["content", "summary"]);
    const id = firstTag(entry, ["id"]) || entryLink || `${entryTitle}-${i}`;
    const categories = Array.from(entry.getElementsByTagName("category"))
      .map((c) => c.getAttribute("term"))
      .filter(Boolean);
    return {
      id,
      title: entryTitle,
      link: entryLink,
      description,
      pubDate: firstTag(entry, ["published", "updated"]),
      author: firstTag(entry, ["author"]),
      categories,
      image: extractImage(entry, description),
    };
  });
  return { title, description, link, articles };
}

// Alcuni feed (es. Gazzetta dello Sport) riusano la stessa immagine "di
// categoria/giornata" su decine di articoli quando non hanno una foto propria
// per quell'articolo. Trattarla come reale produce hero/gallerie con la stessa
// foto ripetuta più volte: se un'immagine compare più di una volta nello stesso
// feed, non è specifica di un articolo, quindi la scartiamo (l'articolo ricade
// sul placeholder seedato in App.jsx).
function dropRepeatedImages(articles) {
  const counts = new Map();
  for (const a of articles) {
    if (!a.image) continue;
    counts.set(a.image, (counts.get(a.image) || 0) + 1);
  }
  return articles.map((a) => (a.image && counts.get(a.image) > 1 ? { ...a, image: null } : a));
}

export function parseFeed(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Il feed non è un XML valido");
  let parsed;
  if (doc.querySelector("feed")) parsed = parseAtom(doc);
  else if (doc.querySelector("channel")) parsed = parseRss(doc);
  else throw new Error("Formato feed non riconosciuto (né RSS né Atom)");
  return { ...parsed, articles: dropRepeatedImages(parsed.articles) };
}

// Autodiscovery: molti siti non espongono direttamente l'URL del feed, ma lo
// dichiarano nell'<head> della homepage con <link rel="alternate" type="...">
// (lo standard usato da tutti i lettori RSS per il tasto "aggiungi da sito").
// Così l'utente può incollare l'indirizzo del sito invece di dover cercare e
// copiare l'URL del feed a mano.
// Alcuni siti (es. corriere.it) non dichiarano affatto il tag di autodiscovery
// in homepage pur avendo un feed valido, raggiungibile su un percorso
// convenzionale. Provati solo come ultima spiaggia, dopo che l'autodiscovery
// standard non ha trovato nulla, e solo se il risultato è davvero un feed
// (mai un 200 generico: molti siti rispondono 200 con una pagina HTML anche
// su percorsi inesistenti).
const COMMON_FEED_PATHS = ["/feed", "/feed/", "/rss.xml", "/rss", "/rss/homepage.xml", "/index.xml"];

// In parallelo come fetchTextWithFallback: provarli in sequenza (fino a 6
// percorsi, ognuno con la sua catena di proxy) potrebbe costare fino a un
// minuto prima di arrendersi.
async function tryCommonFeedPaths(pageUrl) {
  const base = new URL(pageUrl);
  const attempts = COMMON_FEED_PATHS.map(async (path) => {
    const candidate = new URL(path, base).href;
    const text = await fetchTextWithFallback(candidate);
    parseFeed(text);
    return candidate;
  });
  try {
    return await Promise.any(attempts);
  } catch {
    return null;
  }
}

export async function discoverFeedUrl(pageUrl) {
  const html = await fetchTextWithFallback(pageUrl);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const links = Array.from(doc.querySelectorAll('link[rel="alternate"]')).filter((el) => {
    const type = (el.getAttribute("type") || "").toLowerCase();
    return type.includes("rss") || type.includes("atom");
  });
  for (const el of links) {
    const href = el.getAttribute("href");
    if (!href) continue;
    try {
      return new URL(href, pageUrl).href;
    } catch {
      // href malformato, prova il prossimo candidato
    }
  }
  return await tryCommonFeedPaths(pageUrl);
}
