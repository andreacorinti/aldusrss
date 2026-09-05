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
// Il pacchetto "Attualità" (ANSA, Il Fatto Quotidiano, La Repubblica) è stato
// tolto: tutte e tre sono ora tra i default (storage.js), quindi "Aggiungi
// tutte" non avrebbe più aggiunto nulla — un pulsante finto, non un pacchetto
// utile.
export const CURATED_PACKS = [
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
      // hdblog e wired: hint aggiunto (vedi storage.js per il dettaglio su
      // HDblog) — senza, la maggior parte del loro contenuto genuinamente
      // tech finiva in Attualità perché usa categorie troppo generiche
      // (es. "Auto", "Domotica") per matchare le keyword (segnalato
      // dall'utente).
      { id: "hdblog", url: "https://www.hdblog.it/rss/", label: "HDblog.it", weight: 1, sectionHint: "tecnologia" },
      { id: "dday", url: "https://www.dday.it/rss", label: "DDay.it", weight: 1, sectionHint: "tecnologia" },
      { id: "punto-informatico", url: "https://www.punto-informatico.it/feed/", label: "Punto Informatico", weight: 1, sectionHint: "tecnologia" },
      // Tolta dai default (feed cronicamente indietro lato editore), resta
      // qui per chi la vuole comunque — la scheda Feed segnala per fonte
      // se non pubblica nulla di recente.
      { id: "wired", url: "https://www.wired.it/feed/rss", label: "Wired Italia", weight: 1, sectionHint: "tecnologia" },
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
      // Le prime tre fonti EN erano tutte generaliste (finiscono quasi
      // tutte in Attualità): queste aggiungono varietà tematica invece di
      // impilarsi sulla stessa sezione — verificate via curl (raggiungibili
      // sia dirette sia attraverso il proxy CORS, senza redirect che rompe il
      // CORS come successo con Everyeye/ANN) e con pubDate recente, agosto 2026.
      { id: "bbc-sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", label: "BBC Sport", weight: 1, sectionHint: "sport" },
      { id: "bbc-business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", label: "BBC Business", weight: 1, sectionHint: "economia" },
      { id: "bbc-technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", label: "BBC Technology", weight: 1, sectionHint: "tecnologia" },
      { id: "the-verge", url: "https://www.theverge.com/rss/index.xml", label: "The Verge", weight: 1, sectionHint: "tecnologia" },
      // Le cinque sotto arrivano dai bookmark pubblici dell'utente
      // (andreacorinti.com/bookmarks), verificate una per una via curl
      // (settembre 2026): esclusi i blog personali monoautore dell'elenco
      // (contenuto troppo saltuario o non in tema testata/rivista), tenute
      // solo le fonti editoriali con pubblicazione regolare e feed
      // funzionante. Scartate dallo stesso elenco: Angry Metal Guy (il sito
      // dichiara correttamente /feed/ ma è dietro una protezione Cloudflare
      // che blocca anche l'unico proxy CORS rimasto, 403 sia diretto che via
      // proxy — non risolvibile lato client), SadNES City (il parametro
      // ?feed=rss2 restituisce la pagina HTML normale, non un feed reale) e
      // Old Games Italia (XML malformato, articoli fermi al 2023).
      //
      // /feed/ di itsfoss.com reindirizza a questo dominio dedicato (stesso
      // salto cross-domain già visto con Everyeye): puntare già alla
      // destinazione evita il salto. Ha pure l'header CORS proprio (non
      // dipende dal proxy).
      { id: "itsfoss", url: "https://feed.itsfoss.com/", label: "It's FOSS", weight: 1, sectionHint: "tecnologia" },
      { id: "freecodecamp", url: "https://www.freecodecamp.org/news/rss/", label: "freeCodeCamp", weight: 1, sectionHint: "tecnologia" },
      { id: "eff", url: "https://www.eff.org/rss/updates.xml", label: "EFF Deeplinks", weight: 1, sectionHint: "tecnologia" },
      { id: "progressive-subway", url: "https://theprogressivesubway.com/feed/", label: "The Progressive Subway", weight: 1, sectionHint: "cultura" },
      { id: "internet-archive-blog", url: "https://blog.archive.org/feed/", label: "Internet Archive Blog", weight: 1, sectionHint: "cultura" },
    ],
  },
  {
    id: "cronaca-locale",
    label: { it: "Cronaca locale (rete QN)", en: "Local news, Italian (QN network)" },
    feeds: [
      // Corriere della Sera e Gazzetta dello Sport erano state chieste dai
      // tester ("cerco Corriere della Sera") ma escluse: entrambe rispondono
      // 200 ma con pubDate fermo rispettivamente a maggio 2024 e dicembre
      // 2023 (verificato via curl, agosto 2026) — stesso motivo per cui non
      // sono nei default. Queste tre della rete QN (stesso editore, Monrif)
      // invece sono verificate vive con pubDate del giorno stesso.
      { id: "il-resto-del-carlino", url: "https://www.ilrestodelcarlino.it/rss/homepage.xml", label: "Il Resto del Carlino", weight: 1 },
      { id: "la-nazione", url: "https://www.lanazione.it/rss/homepage.xml", label: "La Nazione", weight: 1 },
      { id: "il-giorno", url: "https://www.ilgiorno.it/rss/homepage.xml", label: "Il Giorno", weight: 1 },
    ],
  },
  {
    id: "nerd-it",
    label: { it: "Nerd (videogiochi, anime, manga)", en: "Nerd, Italian (games, anime, manga)" },
    feeds: [
      // Il vecchio /rss/notizie.xml ora risponde con un 301 al vero indirizzo
      // sotto: fetch lo segue automaticamente, ma la risposta finale arriva
      // dritta da everyeye.it invece che dal proxy CORS (nessun
      // Access-Control-Allow-Origin) — bloccata dal browser anche se curl la
      // vede benissimo (segnalato dall'utente: "Failed to fetch" su tutti i
      // tentativi). Puntare già alla destinazione evita il salto.
      { id: "everyeye", url: "https://www.everyeye.it/feed/feed_news_rss.asp", label: "Everyeye.it", weight: 1, sectionHint: "tecnologia" },
      { id: "ign-it", url: "https://it.ign.com/feed.xml", label: "IGN Italia", weight: 1, sectionHint: "tecnologia" },
      { id: "gamesurf", url: "https://www.gamesurf.it/feed/", label: "GameSurf", weight: 1, sectionHint: "tecnologia" },
      { id: "animeclick", url: "https://www.animeclick.it/rss", label: "AnimeClick", weight: 1, sectionHint: "cultura" },
      { id: "mangaforever", url: "https://www.mangaforever.net/feed/", label: "MangaForever", weight: 1, sectionHint: "cultura" },
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
      // falliscono comunque su quel dominio ("failed to fetch" persistente).
      // Sostituita con PCGamer, poi anche questa segnalata in errore
      // dall'utente: il dominio (Future plc, come GamesRadar) è dietro una
      // protezione anti-bot che sembra bloccare selettivamente gli IP dei
      // proxy CORS pubblici usati dall'app — non un problema temporaneo dei
      // proxy stessi (verificato: altri feed passavano nello stesso momento).
      // IGN è una fonte grande e comune, storicamente ben servita dagli
      // stessi proxy.
      { id: "ign", url: "https://www.ign.com/rss/articles/feed", label: "IGN", weight: 1, sectionHint: "tecnologia" },
      { id: "eurogamer", url: "https://www.eurogamer.net/feed", label: "Eurogamer", weight: 1, sectionHint: "tecnologia" },
      // /all/rss.xml risponde con un 301 a un percorso relativo
      // (?ann-edition=us): il browser lo risolve contro l'origine del proxy
      // CORS invece che contro il sito vero, producendo un indirizzo senza
      // senso (es. proxy.cors.sh/all/rss.xml?ann-edition=us) che il proxy
      // rifiuta con 400 — fallisce anche se il feed di partenza è raggiungibile
      // (segnalato dall'utente: "Failed to fetch" su tutti i tentativi).
      // Puntare già alla destinazione evita il salto.
      { id: "ann", url: "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us", label: "Anime News Network", weight: 1, sectionHint: "cultura" },
    ],
  },
];

// Pacchetto pronto ma volutamente non offerto in CURATED_PACKS (richiesto
// dall'utente, agosto 2026): per ora l'app si rivolge solo a chi legge
// IT/EN, lo spagnolo resta un passo successivo. Le keyword di
// classificazione ES in sections.js restano comunque attive (non fanno
// male finché nessuna fonte ES è in circolazione) e i quattro feed sotto
// sono già verificati funzionanti (vedi commit "Più testate autorevoli nei
// default, pacchetto Fonti in spagnolo, keyword ES") — quando si deciderà
// di riaprire, basta rimettere questo oggetto dentro CURATED_PACKS.
export const SPANISH_PACK_DISABLED = {
  id: "spagnolo",
  label: { it: "Fonti in spagnolo", en: "Spanish sources" },
  feeds: [
    { id: "el-pais", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", label: "El País", weight: 1 },
    { id: "el-mundo", url: "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml", label: "El Mundo", weight: 1 },
    { id: "la-vanguardia", url: "https://www.lavanguardia.com/rss/home.xml", label: "La Vanguardia", weight: 1 },
    { id: "bbc-mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml", label: "BBC Mundo", weight: 1 },
  ],
};
