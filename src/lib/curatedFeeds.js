// Elenco curato di feed RSS pubblici italiani, verificati funzionanti e
// aggiornati (via curl, agosto 2026) al momento dell'aggiunta — non una
// garanzia nel tempo: un editore può abbandonare un feed da un giorno
// all'altro senza dismetterlo (vedi Gazzetta e Corriere.it, in "Limiti
// noti" del README). Pensato come punto di partenza più ampio dei soli
// default, non come elenco esaustivo: cresce nel tempo.
//
// Stessa forma degli oggetti in storage.js (id/url/weight/sectionHint):
// un pacchetto si importa "in blocco" senza altra elaborazione.
export const CURATED_PACKS = [
  {
    id: "generalisti",
    sectionId: "attualita",
    feeds: [
      { id: "ansa", url: "https://www.ansa.it/sito/ansait_rss.xml", label: "ANSA", weight: 1 },
      { id: "fatto-quotidiano", url: "https://www.ilfattoquotidiano.it/feed/", label: "Il Fatto Quotidiano", weight: 1 },
      { id: "repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", label: "La Repubblica", weight: 1 },
    ],
  },
  {
    id: "economia",
    sectionId: "economia",
    feeds: [
      { id: "ansa-economia", url: "https://www.ansa.it/sito/notizie/economia/economia_rss.xml", label: "ANSA Economia", weight: 1, sectionHint: "economia" },
      { id: "sole24ore-economia", url: "https://www.ilsole24ore.com/rss/economia.xml", label: "Il Sole 24 Ore", weight: 1, sectionHint: "economia" },
    ],
  },
  {
    id: "sport",
    sectionId: "sport",
    feeds: [
      // Solo una fonte verificata affidabile per ora: Gazzetta dello Sport,
      // Corriere dello Sport e Tuttosport sono risultati abbandonati o con
      // feed vuoti al controllo — vedi commit history per il dettaglio.
      { id: "sky-sport", url: "https://sport.sky.it/rss/sport.xml", label: "Sky Sport", weight: 0.5, sectionHint: "sport" },
    ],
  },
  {
    id: "tecnologia",
    sectionId: "tecnologia",
    feeds: [
      { id: "hdblog", url: "https://www.hdblog.it/rss/", label: "HDblog.it", weight: 1 },
      { id: "dday", url: "https://www.dday.it/rss", label: "DDay.it", weight: 1, sectionHint: "tecnologia" },
      { id: "punto-informatico", url: "https://www.punto-informatico.it/feed/", label: "Punto Informatico", weight: 1, sectionHint: "tecnologia" },
    ],
  },
  {
    id: "cultura",
    sectionId: "cultura",
    feeds: [
      { id: "ansa-cultura", url: "https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml", label: "ANSA Cultura", weight: 1, sectionHint: "cultura" },
      { id: "artribune", url: "https://www.artribune.com/feed/", label: "Artribune", weight: 1, sectionHint: "cultura" },
    ],
  },
];
