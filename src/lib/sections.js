export const DEFAULT_SECTION_ID = "attualita";
export const FRONT_PAGE_ID = "prima-pagina";

// Parole chiave IT+EN in un unico elenco per sezione: i feed reali mischiano lingue
// (es. BBC in inglese accanto ad ANSA in italiano) quindi la classificazione deve
// riconoscere entrambe. "attualita" non ha keyword: è il fallback quando nessuna
// sezione specializzata matcha.
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
    keywords: ["economia", "finanza", "borsa", "mercati", "lavoro", "business", "economy", "markets", "finance"],
  },
  sport: {
    id: "sport",
    label: "Sport",
    templateId: "sportivo",
    keywords: [
      "calcio", "tennis", "basket", "volley", "ciclismo", "formula 1", "nba", "serie a", "motogp",
      "pallavolo", "rugby", "golf", "nuoto", "olimpiadi", "sport",
      "football", "soccer", "cricket", "olympics", "athletics",
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
    ],
  },
};

// Ordine dei pill: "Prima Pagina" (vista composta, non una sezione di classificazione)
// va sempre per prima e viene aggiunta a parte da chi consuma questo elenco.
export const SECTION_ORDER = ["attualita", "economia", "sport", "tecnologia", "cultura"];
