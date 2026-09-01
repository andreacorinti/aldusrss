// Importazione di un file OPML (l'export standard di qualunque lettore RSS,
// es. Feedly, Inoreader, NetNewsWire): un elenco di <outline xmlUrl="...">
// annidati a piacere sotto <body> (spesso raggruppati per cartella/categoria,
// altre volte piatti). querySelectorAll traversa comunque tutta la
// discendenza a prescindere dalla profondità, quindi non serve ricorsione
// manuale sull'albero delle cartelle.
export function parseOpml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("File OPML non valido");
  const body = doc.querySelector("body");
  if (!body) throw new Error("File OPML non valido");

  const seen = new Set();
  const entries = [];
  for (const el of body.querySelectorAll("outline[xmlUrl]")) {
    const url = (el.getAttribute("xmlUrl") || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    // "title" è lo standard OPML 2.0, "text" è l'unico presente in export
    // più vecchi/minimali: entrambi finiscono per contenere lo stesso nome
    // testata nella pratica.
    const label = (el.getAttribute("title") || el.getAttribute("text") || "").trim();
    entries.push(label ? { url, label } : { url });
  }
  return entries;
}
