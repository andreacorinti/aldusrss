export const DEFAULT_SECTION_ID = "attualita";
export const FRONT_PAGE_ID = "prima-pagina";

// Parole chiave IT+EN+ES in un unico elenco per sezione: i feed reali mischiano
// lingue (es. BBC in inglese accanto ad ANSA in italiano, ora anche El País in
// spagnolo) quindi la classificazione deve riconoscere tutte e tre. "attualita"
// non ha keyword: è il fallback quando nessuna sezione specializzata matcha.
//
// Termini spagnoli scelti evitando parole che iniziano o finiscono con una
// vocale accentata o la ñ: compileKeywords usa \b, che si basa su \w (solo
// ASCII, nessun flag `u`) — un accento proprio al bordo della parola
// impedirebbe il match del confine (es. "café" seguito da uno spazio non
// troverebbe mai un confine di parola valido). Gli accenti a metà parola
// (es. "económico") non hanno questo problema, contano solo i due caratteri
// esterni.
export const SECTIONS = {
  attualita: {
    id: "attualita",
    label: "Attualità",
    templateId: "quotidiano",
    keywords: [],
  },
  economia: {
    id: "economia",
    label: "Economia",
    templateId: "quotidiano",
    keywords: [
      "economia", "finanza", "borsa", "mercati", "lavoro", "business",
      "inflazione", "pil", "spread", "fisco", "tasse", "manovra",
      "recessione", "occupazione", "disoccupazione", "stipendi", "pensioni",
      "bce", "banca centrale", "petrolio", "obbligazioni",
      "economy", "markets", "finance", "inflation", "stock market", "gdp",
      "recession", "unemployment", "wall street", "nasdaq", "interest rates",
      "economía", "finanzas", "bolsa", "mercados", "empleo", "inflación",
      "impuestos", "recesión", "desempleo", "salarios", "pensiones",
      "petróleo", "banco central",
    ],
  },
  sport: {
    id: "sport",
    label: "Sport",
    templateId: "sportivo",
    // Ampliato (segnalato dall'utente: fonti generaliste come ANSA/RaiNews non
    // taggano quasi mai la categoria, quindi la classificazione dipende quasi
    // solo dal titolo — squadre, competizioni e nomi di atleti molto seguiti
    // che non contengono mai le parole generiche "calcio"/"sport" restavano
    // in Attualità, sfuggendo così anche allo sconto di Prima Pagina per lo
    // sport). Nomi propri limitati a pochi atleti di punta evergreen: una
    // lista esaustiva richiederebbe manutenzione continua.
    keywords: [
      "calcio", "tennis", "basket", "pallacanestro", "volley", "pallavolo", "ciclismo",
      "formula 1", "f1", "nba", "serie a", "serie b", "motogp", "moto gp",
      "rugby", "golf", "nuoto", "pallanuoto", "olimpiadi", "paralimpiadi", "sport",
      "champions league", "europa league", "conference league", "coppa italia",
      "supercoppa", "mondiali", "mondiale", "europei", "nations league",
      "premier league", "liga", "bundesliga", "ligue 1", "atp", "wta",
      "giro d'italia", "tour de france", "coppa davis",
      "scudetto", "derby", "atletica", "maratona",
      "boxe", "pugilato", "sinner", "alcaraz", "djokovic",
      "football", "soccer", "cricket", "olympics", "paralympics", "athletics",
      "world cup", "grand slam", "wimbledon",
      "formula one", "boxing", "cycling",
      "fútbol", "tenis", "baloncesto", "voleibol", "fórmula 1",
      "juegos olímpicos", "maratón", "boxeo", "atletismo", "copa del mundo",
      "selección",
    ],
  },
  tecnologia: {
    id: "tecnologia",
    label: "Tecnologia",
    templateId: "magazine",
    keywords: [
      "tecnologia", "smartphone", "intelligenza artificiale", "gadget", "software", "hardware",
      "videogiochi", "gaming", "digitale", "scienza",
      "technology", "tech", "science", "robot",
      "games", "game", "videogame", "esports", "playstation", "xbox", "nintendo",
      "android", "ios", "app", "iphone", "samsung", "app store",
      "chrome", "windows", "stampa 3d", "3d printing",
      "criptovalute", "bitcoin", "blockchain", "sicurezza informatica",
      "cybersicurezza", "hacker", "cloud", "chatgpt",
      "cybersecurity", "cryptocurrency", "artificial intelligence", "startup",
      "tecnología", "inteligencia artificial", "videojuegos", "ciberseguridad",
      "criptomonedas", "ordenador", "aplicación", "impresión 3d",
    ],
  },
  // Include anche lo spettacolo (cinema, tv, celebrità): tolta la sezione
  // Gossip dedicata (troppo poco alimentata dalle fonti disponibili per
  // valerne la complessità), l'intrattenimento in senso ampio resta qui —
  // convenzione comune nei quotidiani italiani ("Cultura e Spettacoli").
  cultura: {
    id: "cultura",
    label: "Cultura",
    templateId: "rivista",
    keywords: [
      "cultura", "arte", "cinema", "libri", "musica", "teatro",
      "culture", "arts", "film", "books",
      "spettacolo", "spettacoli", "entertainment", "celebrity",
      "anime", "manga", "manhwa", "cosplay",
      "serie tv", "concerto", "concerti", "festival", "mostra", "mostre",
      "romanzo", "danza", "oscar", "sanremo", "netflix",
      "tv series", "streaming", "grammy",
      "cine", "libros", "música", "espectáculo", "espectáculos",
      "concierto", "conciertos", "estreno", "premios",
    ],
  },
};

// Ordine dei pill: "Prima Pagina" (vista composta, non una sezione di classificazione)
// va sempre per prima e viene aggiunta a parte da chi consuma questo elenco.
export const SECTION_ORDER = ["attualita", "economia", "sport", "tecnologia", "cultura"];
