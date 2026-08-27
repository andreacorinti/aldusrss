// Elenco curato di feed RSS pubblici, verificati funzionanti e aggiornati
// (via curl, agosto 2026) al momento dell'aggiunta — non una garanzia nel
// tempo: un editore può abbandonare un feed da un giorno all'altro senza
// dismetterlo (vedi Gazzetta, Corriere.it e Wired Italia, tolte dai default
// per questo). Pensato come punto di partenza più ampio dei soli default,
// non come elenco esaustivo: cresce nel tempo.
//
// Stessa forma degli oggetti in storage.js (id/url/weight/sectionHint):
// un pacchetto si importa "in blocco" senza altra elaborazione. `label` è
// bilingue (mostrato secondo la lingua dell'interfaccia) perché alcuni
// pacchetti non corrispondono a una sezione esistente dell'app.
export const CURATED_PACKS = [
  {
    id: "generalisti",
    label: { it: "Attualità", en: "News" },
    feeds: [
      { id: "ansa", url: "https://www.ansa.it/sito/ansait_rss.xml", label: "ANSA", weight: 1 },
      { id: "fatto-quotidiano", url: "https://www.ilfattoquotidiano.it/feed/", label: "Il Fatto Quotidiano", weight: 1 },
      { id: "repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", label: "La Repubblica", weight: 1 },
    ],
  },
  {
    id: "economia",
    label: { it: "Economia", en: "Business" },
    feeds: [
      { id: "ansa-economia", url: "https://www.ansa.it/sito/notizie/economia/economia_rss.xml", label: "ANSA Economia", weight: 1, sectionHint: "economia" },
      { id: "sole24ore-economia", url: "https://www.ilsole24ore.com/rss/economia.xml", label: "Il Sole 24 Ore", weight: 1, sectionHint: "economia" },
    ],
  },
  {
    id: "sport",
    label: { it: "Sport", en: "Sport" },
    feeds: [
      // Solo una fonte verificata affidabile per ora: Gazzetta dello Sport,
      // Corriere dello Sport e Tuttosport sono risultati abbandonati o con
      // feed vuoti al controllo — vedi commit history per il dettaglio.
      { id: "sky-sport", url: "https://sport.sky.it/rss/sport.xml", label: "Sky Sport", weight: 0.5, sectionHint: "sport" },
    ],
  },
  {
    id: "tecnologia",
    label: { it: "Tecnologia", en: "Tech" },
    feeds: [
      { id: "hdblog", url: "https://www.hdblog.it/rss/", label: "HDblog.it", weight: 1 },
      { id: "dday", url: "https://www.dday.it/rss", label: "DDay.it", weight: 1, sectionHint: "tecnologia" },
      { id: "punto-informatico", url: "https://www.punto-informatico.it/feed/", label: "Punto Informatico", weight: 1, sectionHint: "tecnologia" },
      // Tolta dai default (feed cronicamente indietro lato editore), resta
      // qui per chi la vuole comunque — la scheda Feed segnala per fonte
      // se non pubblica nulla di recente.
      { id: "wired", url: "https://www.wired.it/feed/rss", label: "Wired Italia", weight: 1 },
    ],
  },
  {
    id: "cultura",
    label: { it: "Cultura", en: "Culture" },
    feeds: [
      { id: "ansa-cultura", url: "https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml", label: "ANSA Cultura", weight: 1, sectionHint: "cultura" },
      { id: "artribune", url: "https://www.artribune.com/feed/", label: "Artribune", weight: 1, sectionHint: "cultura" },
    ],
  },
  {
    id: "inglese",
    label: { it: "Fonti in inglese", en: "English sources" },
    feeds: [
      { id: "bbc-news", url: "https://feeds.bbci.co.uk/news/rss.xml", label: "BBC News", weight: 1 },
      { id: "guardian-world", url: "https://www.theguardian.com/world/rss", label: "The Guardian", weight: 1 },
      { id: "npr", url: "https://feeds.npr.org/1001/rss.xml", label: "NPR", weight: 1 },
    ],
  },
  {
    id: "nerd-it",
    label: { it: "Nerd (videogiochi, anime, manga)", en: "Nerd, Italian (games, anime, manga)" },
    feeds: [
      { id: "everyeye", url: "https://www.everyeye.it/rss/notizie.xml", label: "Everyeye.it", weight: 1, sectionHint: "tecnologia" },
      { id: "animeclick", url: "https://www.animeclick.it/rss", label: "AnimeClick", weight: 1, sectionHint: "cultura" },
      // Blog personale, contenuto misto (internet, videogiochi, musica
      // metal...) — niente sectionHint di proposito, come HDblog: forzare
      // tutto in una sezione sarebbe sbagliato tanto quanto lo era per lui.
      { id: "andreacorinti", url: "https://www.andreacorinti.com/feed", label: "Andrea Corinti", weight: 1 },
    ],
  },
  {
    id: "nerd-en",
    label: { it: "Nerd in inglese (videogiochi, anime, manga)", en: "Nerd (games, anime, manga)" },
    feeds: [
      { id: "kotaku", url: "https://kotaku.com/feed", label: "Kotaku", weight: 1, sectionHint: "tecnologia" },
      // Polygon tolta: nessun header CORS sul feed e i proxy pubblici
      // falliscono comunque su quel dominio (segnalato dall'utente:
      // "failed to fetch" persistente) — sostituita con PCGamer.
      { id: "pcgamer", url: "https://www.pcgamer.com/rss/", label: "PCGamer", weight: 1, sectionHint: "tecnologia" },
      { id: "eurogamer", url: "https://www.eurogamer.net/feed", label: "Eurogamer", weight: 1, sectionHint: "tecnologia" },
      { id: "ann", url: "https://www.animenewsnetwork.com/all/rss.xml", label: "Anime News Network", weight: 1, sectionHint: "cultura" },
    ],
  },
];
