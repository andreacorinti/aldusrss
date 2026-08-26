// Traduzione dell'interfaccia (non del contenuto dei feed, che resta nella lingua
// originale della fonte). Pensato in ottica app nativa futura: su Android/iOS la
// lingua di sistema sarebbe letta direttamente dall'OS; qui "auto" usa
// navigator.language come equivalente web.
export const LANGUAGES = [
  { value: "auto", labelKey: "languageAuto" },
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
];

const STRINGS = {
  it: {
    frontPage: "Prima Pagina",
    tabFront: "Prima pagina",
    tabFeeds: "Feed",
    tabSettings: "Impostazioni",
    "section.attualita": "Attualità",
    "section.mondo": "Mondo",
    "section.economia": "Economia",
    "section.sport": "Sport",
    "section.tecnologia": "Tecnologia",
    "section.cultura": "Cultura",
    "section.gossip": "Gossip",
    frontEmptySection: "Nessun articolo disponibile in questa sezione al momento.",
    readOriginal: "Leggi l'articolo originale",
    feedsTitle: "I tuoi feed",
    feedsSubtitle: 'Ogni fonte alimenta le sezioni del tuo giornale. Il peso decide quanto conta in "Prima Pagina".',
    statusLoading: "caricamento…",
    statusErrorFallback: "errore di caricamento",
    statusStale: "non raggiungibile, mostro l'ultima copia",
    errorInvalidUrl: "URL non valido",
    errorDuplicateFeed: "Questo feed è già nella lista",
    addButton: "Aggiungi",
    cancelButton: "Annulla",
    addFeedButton: "Aggiungi un feed RSS",
    feedUrlPlaceholder: "corriere.it oppure il link diretto al feed",
    feedAddHint: "Puoi incollare l'indirizzo del sito: proviamo a trovare il feed da soli.",
    weightLow: "Basso",
    weightNormal: "Normale",
    weightHigh: "Alto",
    weightTooltip: "Peso: {weight} (tocca per cambiare)",
    darkModeLabel: "Modalità notte",
    languageLabel: "Lingua",
    languageHint: "Lingua dell'interfaccia (i contenuti restano nella lingua della fonte)",
    languageAuto: "Automatica (sistema)",
    sectionsVisibleTitle: "Sezioni visibili",
    sectionsVisibleSubtitle: "Nascondi le sezioni che non ti interessano, riordinale con le frecce",
    sectionMoveUp: "Sposta su",
    sectionMoveDown: "Sposta giù",
    noUnreadNote: 'Nessun contatore di "non letti": il giornale si aggiorna da solo, aprilo quando vuoi tu.',
    creditsLine: "Realizzato da Andrea Corinti",
    emptyNoFeeds: 'Nessun feed configurato. Aggiungine uno dalla scheda "Feed".',
    loadingPaper: "Caricamento del giornale in corso…",
  },
  en: {
    frontPage: "Front Page",
    tabFront: "Front page",
    tabFeeds: "Feeds",
    tabSettings: "Settings",
    "section.attualita": "News",
    "section.mondo": "World",
    "section.economia": "Business",
    "section.sport": "Sport",
    "section.tecnologia": "Tech",
    "section.cultura": "Culture",
    "section.gossip": "Gossip",
    frontEmptySection: "No articles available in this section right now.",
    readOriginal: "Read the original article",
    feedsTitle: "Your feeds",
    feedsSubtitle: 'Each source feeds your paper\'s sections. Weight decides how much it counts in "Front Page".',
    statusLoading: "loading…",
    statusErrorFallback: "loading error",
    statusStale: "unreachable, showing the last saved copy",
    errorInvalidUrl: "Invalid URL",
    errorDuplicateFeed: "This feed is already in your list",
    addButton: "Add",
    cancelButton: "Cancel",
    addFeedButton: "Add an RSS feed",
    feedUrlPlaceholder: "bbc.com or a direct feed link",
    feedAddHint: "You can paste the site's address: we'll try to find the feed for you.",
    weightLow: "Low",
    weightNormal: "Normal",
    weightHigh: "High",
    weightTooltip: "Weight: {weight} (tap to change)",
    darkModeLabel: "Dark mode",
    languageLabel: "Language",
    languageHint: "Interface language (content stays in the source's own language)",
    languageAuto: "Automatic (system)",
    sectionsVisibleTitle: "Visible sections",
    sectionsVisibleSubtitle: "Hide sections you're not interested in, reorder them with the arrows",
    sectionMoveUp: "Move up",
    sectionMoveDown: "Move down",
    noUnreadNote: 'No "unread" counters: your paper updates itself, open it whenever you like.',
    creditsLine: "Made by Andrea Corinti",
    emptyNoFeeds: 'No feeds configured yet. Add one from the "Feeds" tab.',
    loadingPaper: "Loading your paper…",
  },
};

export function resolveLanguage(pref) {
  if (pref === "it" || pref === "en") return pref;
  try {
    const nav = (navigator.language || "it").slice(0, 2).toLowerCase();
    return STRINGS[nav] ? nav : "it";
  } catch {
    return "it";
  }
}

export function t(lang, key) {
  return STRINGS[lang]?.[key] ?? STRINGS.it[key] ?? key;
}
