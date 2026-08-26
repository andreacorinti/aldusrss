const CORS_PROXY = "https://api.allorigins.win/raw?url=";

export async function fetchFeedXML(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch {
    const res = await fetch(CORS_PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error(`Impossibile scaricare il feed (HTTP ${res.status})`);
    return await res.text();
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
  const media = itemEl.getElementsByTagName("media:content")[0] || itemEl.getElementsByTagName("media:thumbnail")[0];
  if (media) {
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

export function parseFeed(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Il feed non è un XML valido");
  if (doc.querySelector("feed")) return parseAtom(doc);
  if (doc.querySelector("channel")) return parseRss(doc);
  throw new Error("Formato feed non riconosciuto (né RSS né Atom)");
}
