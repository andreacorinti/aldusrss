import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Rss, Newspaper, Settings2 } from "lucide-react";
import { discoverFeedUrl, loadFeedData } from "./lib/rss";
import { parseOpml } from "./lib/opml";
import { composeArticles } from "./lib/classify";
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from "./lib/templates";
import { SECTIONS, SECTION_ORDER as DEFAULT_SECTION_ORDER, DEFAULT_SECTION_ID, FRONT_PAGE_ID } from "./lib/sections";
import { resolveLanguage, t } from "./lib/i18n";
import { mapArticle, buildSectionMeta, resolveTemplate, CHROME_LIGHT, CHROME_DARK } from "./lib/viewModel";
import {
  loadFeedList,
  saveFeedList,
  loadCache,
  saveSourceCache,
  removeSourceCache,
  clearAllSourceCache,
  loadHiddenSections,
  saveHiddenSections,
  loadSectionOrderPref,
  saveSectionOrderPref,
  loadDarkMode,
  saveDarkMode,
} from "./lib/storage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StatusBar } from "./components/StatusBar";
import { Masthead } from "./components/Masthead";
import { SectionTabs } from "./components/SectionTabs";
import { PullToRefresh } from "./components/PullToRefresh";
import { FrontPage } from "./components/FrontPage";
import { ArticleView } from "./components/ArticleView";
import { FeedsScreen } from "./components/FeedsScreen";
import { SettingsScreen } from "./components/SettingsScreen";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,900;1,9..144,500;1,9..144,700&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap');

/* Dissolvenza per le immagini di hero/secondaria quando cambia sezione: senza,
   il cambio di src era un "pop" istantaneo, percepito come scattoso nonostante
   fosse comunque immediato (segnalato testando il cambio di sezione). Serve un
   key legato al contenuto (non un indice di posizione) perché React rimonti
   davvero il nodo e faccia ripartire l'animazione — vedi FrontPage in App.jsx. */
@keyframes aldusPhotoIn {
  from { opacity: 0; transform: scale(1.015); }
  to { opacity: 1; transform: scale(1); }
}
`;

// Nel browser (demo) l'app disegna la propria cornice "telefono" (bordo
// arrotondato, status bar finta) per mostrare il layout senza uscire dal
// desktop. Dentro l'app Android/iOS vera è già a schermo intero su un
// telefono reale: quella cornice andrebbe a creare un "telefono nel
// telefono" — va tolta, il contenuto occupa tutto lo schermo.
const IS_NATIVE = Capacitor.isNativePlatform();

// La build desktop (Electron, vedi electron/main.cjs) gira in una finestra
// vera e ridimensionabile, non su un telefono: la stessa cornice-telefono
// del browser di sviluppo ci starebbe "dentro" la finestra come un secondo
// telefono, sprecando quasi tutto lo spazio orizzontale (segnalato
// dall'utente). Rilevata da un flag esposto da electron/preload.cjs, non
// dallo user agent: "Electron/x.y.z" compare in qualunque webview ospitato
// da un programma basato su Electron (es. il browser integrato di VS Code),
// non solo nella nostra build — con lo sniffing, aprire "npm run dev" dentro
// un editor del genere mostrava per errore il layout desktop invece della
// cornice-telefono usata per testare la UI mobile (segnalato dall'utente).
const IS_ELECTRON = typeof window !== "undefined" && window.__ALDUSRSS_DESKTOP__ === true;

// Condizione comune per "niente cornice-telefono, occupa la finestra/lo
// schermo intero": vera sia su Android/iOS reali sia dentro Electron.
const IS_FULL_BLEED = IS_NATIVE || IS_ELECTRON;

// Quante fonti aggiornare in parallelo, condiviso da tutta l'app tramite la
// coda di refresh più sotto (enqueueRefresh). Alzato da 3 a 6 dopo uno
// stress test mirato (agosto 2026, script Node su fetchTextWithFallback,
// tutte le 43 fonti attuali di default+pacchetti curati, ripetuto più
// volte): concorrenza 3 impiegava ~4.3s, 6 ~2.5s (quasi il doppio più
// veloce), 8 ~2.2s ma con margine risicato, 10 peggiorava di nuovo a ~2.8s
// (segno di saturazione del proxy) — stesso tasso di successo (42/43) a
// ogni livello testato, quindi non è un compromesso su affidabilità. 6
// resta un margine di sicurezza sotto al punto dove i tempi ricominciano a
// peggiorare, invece di inseguire il minimo assoluto misurato una volta sola.
const REFRESH_CONCURRENCY = 6;

// Plugin nativo Android (vedi CacheClearPlugin.java) che svuota la cache
// della WebView — immagini e risposte di rete delle fonti RSS, la parte che
// pesa davvero sullo spazio occupato dall'app. Non esiste su web/Electron:
// lì il pulsante "Svuota cache" in Impostazioni si limita a cancellare gli
// articoli salvati in localStorage (comunque utile per liberare quello
// spazio e forzare un refresh pulito, solo meno rilevante in termini di MB).
const CacheClearPlugin = registerPlugin("CacheClear");

export default function App() {
  const [feedList, setFeedList] = useState(() => loadFeedList());
  const [sources, setSources] = useState({});
  const [hiddenSections, setHiddenSections] = useState(() => loadHiddenSections());
  const [sectionOrder, setSectionOrder] = useState(() => {
    const stored = loadSectionOrderPref();
    if (!stored) return DEFAULT_SECTION_ORDER;
    const valid = stored.filter((id) => SECTIONS[id]);
    const missing = DEFAULT_SECTION_ORDER.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  });
  const [darkMode, setDarkMode] = useState(() => loadDarkMode());
  const [tab, setTab] = useState("front");
  const [activeSection, setActiveSection] = useState(FRONT_PAGE_ID);
  const [article, setArticle] = useState(false);

  // Il tasto "indietro" hardware di Android, senza un listener dedicato,
  // fa da sé: chiude/minimizza l'app invece di tornare alla schermata
  // precedente (Capacitor non intercetta il back button di default).
  // Segnalato dal tester Jovan: aprendo un articolo in Prima Pagina e
  // premendo "indietro" l'app si chiudeva invece di tornare alla lista.
  // I ref (invece di leggere tab/article direttamente) servono perché il
  // listener va registrato una sola volta: senza ref leggerebbe per sempre
  // i valori del primo render.
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  const articleRef = useRef(article);
  useEffect(() => { articleRef.current = article; }, [article]);
  useEffect(() => {
    if (!IS_NATIVE) return;
    const handlePromise = CapacitorApp.addListener("backButton", () => {
      if (articleRef.current) {
        setArticle(false);
      } else if (tabRef.current !== "front") {
        setTab("front");
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => { handlePromise.then((handle) => handle.remove()); };
  }, []);

  const refreshSource = useCallback(async (feed) => {
    setSources((prev) => ({ ...prev, [feed.id]: { ...(prev[feed.id] || {}), id: feed.id, status: "loading" } }));
    try {
      const data = await loadFeedData(feed.url, feed.sectionHint);
      saveSourceCache(feed.id, data);
      setSources((prev) => ({ ...prev, [feed.id]: { id: feed.id, status: "ready", ...data } }));
    } catch (err) {
      const cached = loadCache()[feed.id];
      if (cached) {
        setSources((prev) => ({ ...prev, [feed.id]: { id: feed.id, status: "stale", errorMessage: err.message, ...cached } }));
      } else {
        setSources((prev) => ({ ...prev, [feed.id]: { id: feed.id, status: "error", errorMessage: err.message } }));
      }
    }
  }, []);

  // Coda di refresh CONDIVISA fra tutti i punti che possono far partire un
  // fetch (caricamento iniziale, pull-to-refresh, aggiunta di un pacchetto):
  // prima ognuno avviava il proprio runWithConcurrency(..., REFRESH_CONCURRENCY,
  // ...) indipendente, quindi il tetto di concorrenza valeva solo ALL'INTERNO
  // di ogni singola chiamata — aggiungere più pacchetti uno via l'altro (o
  // aggiungerne uno mentre il caricamento iniziale era ancora in corso)
  // sommava più "batch da 3" in parallelo, superando di fatto il tetto e
  // sovraccaricando l'unico proxy CORS rimasto (segnalato dall'utente:
  // qualche fonte irraggiungibile aggiungendo più pacchetti in blocco). Ora
  // un'unica coda e un unico pool di worker, dimensionato una volta sola:
  // qualunque cosa la alimenti, non più di REFRESH_CONCURRENCY fetch reali
  // sono mai in volo contemporaneamente in tutta l'app.
  const refreshQueueRef = useRef([]);
  const activeRefreshWorkersRef = useRef(0);

  const pumpRefreshWorkers = useCallback(() => {
    while (activeRefreshWorkersRef.current < REFRESH_CONCURRENCY && refreshQueueRef.current.length > 0) {
      activeRefreshWorkersRef.current++;
      (async () => {
        let job;
        while ((job = refreshQueueRef.current.shift())) {
          await job();
        }
        activeRefreshWorkersRef.current--;
      })();
    }
  }, []);

  const enqueueRefresh = useCallback((feeds) => {
    if (feeds.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      let remaining = feeds.length;
      for (const feed of feeds) {
        refreshQueueRef.current.push(async () => {
          await refreshSource(feed);
          if (--remaining === 0) resolve();
        });
      }
      pumpRefreshWorkers();
    });
  }, [refreshSource, pumpRefreshWorkers]);

  useEffect(() => {
    enqueueRefresh(feedList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAllFeeds = useCallback(() => {
    enqueueRefresh(feedList);
  }, [feedList, enqueueRefresh]);

  // "Svuota cache" in Impostazioni: cancella gli articoli salvati (non
  // l'elenco dei feed) e, su Android, anche la cache della WebView
  // (immagini comprese) tramite CacheClearPlugin — poi rifà subito un
  // refresh completo, così l'utente non si ritrova con un giornale vuoto
  // in attesa che tocchi lui "Aggiorna".
  const clearCache = useCallback(async () => {
    clearAllSourceCache();
    setSources({});
    if (IS_NATIVE) {
      try {
        await CacheClearPlugin.clear();
      } catch {
        // plugin non disponibile (piattaforma diversa da Android): la pulizia
        // di localStorage sopra resta comunque valida.
      }
    }
    await enqueueRefresh(feedList);
  }, [feedList, enqueueRefresh]);

  // Importa in blocco un pacchetto di fonti curate (curatedFeeds.js): gli
  // URL sono già noti e verificati, quindi non serve l'autodiscovery usata
  // per un URL incollato a mano — salta semplicemente chi è già in elenco.
  const addFeedsBulk = useCallback(async (curatedFeeds) => {
    const existingUrls = new Set(feedList.map((f) => f.url));
    const toAdd = curatedFeeds.filter((cf) => !existingUrls.has(cf.url));
    if (toAdd.length === 0) return;
    const newFeeds = toAdd.map((cf) => ({
      id: crypto.randomUUID(),
      url: cf.url,
      enabled: true,
      weight: cf.weight ?? 1,
      ...(cf.sectionHint ? { sectionHint: cf.sectionHint } : {}),
      ...(cf.label ? { label: cf.label } : {}),
    }));
    setFeedList((prev) => {
      const next = [...prev, ...newFeeds];
      saveFeedList(next);
      return next;
    });
    await enqueueRefresh(newFeeds);
  }, [feedList, enqueueRefresh]);

  // Importa un file OPML (l'export standard di qualunque altro lettore RSS):
  // stesso percorso di addFeedsBulk sopra, quindi stesso comportamento sugli
  // URL già in elenco (saltati, non duplicati) — qui però gli URL vengono da
  // un file esterno mai verificato, non da un pacchetto curato, quindi non
  // c'è garanzia che siano feed funzionanti: eventuali fonti morte
  // compariranno comunque in Feed con lo stato di errore, come già succede
  // per qualunque fonte che smette di rispondere.
  const importOpml = useCallback(async (opmlText) => {
    const entries = parseOpml(opmlText);
    if (entries.length === 0) throw new Error("nessuna fonte trovata nel file OPML");
    const existingUrls = new Set(feedList.map((f) => f.url));
    const added = entries.filter((e) => !existingUrls.has(e.url)).length;
    await addFeedsBulk(entries);
    return { added, total: entries.length };
  }, [feedList, addFeedsBulk]);

  // Aggiunge una fonte solo se si riesce davvero a scaricarla e a leggerla
  // come feed — mai "nel dubbio, aggiungiamola comunque e vediamo se
  // funziona": un URL che non porta a nessun feed reale (una frase digitata
  // per errore, un sito senza feed) restava altrimenti in elenco per
  // sempre, fallito in silenzio con un errore tecnico incomprensibile
  // (trovato testando con un profilo non tecnico). Se non si trova nulla,
  // lancia un errore — il chiamante (FeedsScreen) lo mostra nel form invece
  // di chiudere come se fosse andato tutto bene.
  const addFeed = useCallback(async (url, label) => {
    let feedUrl = url;
    let data = null;
    try {
      data = await loadFeedData(url);
    } catch {
      // non è un feed diretto: prova a scoprirlo dall'<head> della pagina
      // (autodiscovery standard, es. <link rel="alternate" type="application/rss+xml">)
      try {
        const discovered = await discoverFeedUrl(url);
        if (discovered) {
          feedUrl = discovered;
          data = await loadFeedData(discovered);
        }
      } catch {
        // nessuna autodiscovery riuscita
      }
    }
    if (!data) throw new Error("no feed found");
    const id = crypto.randomUUID();
    const newFeed = { id, url: feedUrl, enabled: true, weight: 1, ...(label ? { label } : {}) };
    setFeedList((prev) => {
      const next = [...prev, newFeed];
      saveFeedList(next);
      return next;
    });
    saveSourceCache(id, data);
    setSources((prev) => ({ ...prev, [id]: { id, status: "ready", ...data } }));
  }, []);

  const removeFeed = useCallback((id) => {
    setFeedList((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveFeedList(next);
      return next;
    });
    removeSourceCache(id);
    setSources((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Rimuove in blocco tutte le fonti di un pacchetto curato (identificate per
  // URL, come addFeedsBulk le aggiunge): un solo aggiornamento di stato
  // invece di N chiamate a removeFeed, così anche i pacchetti più lunghi
  // (es. Nerd, 6 fonti) si tolgono con un click invece che uno alla volta
  // dalla X di ogni riga (segnalato dall'utente).
  const removeFeedsBulk = useCallback((urls) => {
    const urlSet = new Set(urls);
    const idsToRemove = feedList.filter((f) => urlSet.has(f.url)).map((f) => f.id);
    if (idsToRemove.length === 0) return;
    setFeedList((prev) => {
      const next = prev.filter((f) => !urlSet.has(f.url));
      saveFeedList(next);
      return next;
    });
    for (const id of idsToRemove) removeSourceCache(id);
    setSources((prev) => {
      const next = { ...prev };
      for (const id of idsToRemove) delete next[id];
      return next;
    });
  }, [feedList]);

  const toggleFeed = useCallback((id) => {
    setFeedList((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f));
      saveFeedList(next);
      return next;
    });
  }, []);

  const changeWeight = useCallback((id, value) => {
    setFeedList((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, weight: value } : f));
      saveFeedList(next);
      return next;
    });
  }, []);

  const toggleSectionHidden = useCallback((id) => {
    setHiddenSections((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      saveHiddenSections(next);
      return next;
    });
  }, []);

  const reorderSections = useCallback((newOrder) => {
    setSectionOrder(newOrder);
    saveSectionOrderPref(newOrder);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      saveDarkMode(next);
      return next;
    });
  }, []);

  const chrome = darkMode ? CHROME_DARK : CHROME_LIGHT;
  const lang = useMemo(() => resolveLanguage(), []);

  // "loading" può voler dire "primo caricamento in corso, nessun dato ancora"
  // oppure "refresh in corso, ma i dati della volta precedente ci sono
  // ancora". Solo il primo caso deve nascondere la pagina: nel secondo,
  // continuare a mostrare i vecchi articoli mentre i nuovi arrivano in
  // background è molto meno spiazzante di far sparire tutto e ricomparire.
  const hasArticles = (entry) => !!entry && Array.isArray(entry.articles);
  const anyReady = Object.values(sources).some(hasArticles);
  const isRefreshing = Object.values(sources).some((s) => s && s.status === "loading");

  const allArticles = useMemo(() => {
    const list = [];
    for (const feed of feedList) {
      if (!feed.enabled) continue;
      const entry = sources[feed.id];
      if (!hasArticles(entry)) continue;
      const sourceName = feed.label || entry.feedMeta?.title || feed.url;
      for (const a of entry.articles || []) {
        list.push({ ...a, sourceId: feed.id, sourceName, section: a.section || DEFAULT_SECTION_ID });
      }
    }
    return list;
  }, [feedList, sources]);

  const sourceWeights = useMemo(() => {
    const map = {};
    for (const f of feedList) map[f.id] = f.weight ?? 1;
    return map;
  }, [feedList]);

  const visibleSections = useMemo(() => {
    const present = new Set(allArticles.map((a) => a.section));
    return sectionOrder.filter((id) => present.has(id) && !hiddenSections.includes(id));
  }, [allArticles, hiddenSections, sectionOrder]);

  const sectionTabs = useMemo(() => {
    const frontTemplate = resolveTemplate(TEMPLATES[DEFAULT_TEMPLATE_ID], darkMode);
    const tabs = [{ id: FRONT_PAGE_ID, label: t(lang, "frontPage"), accent: frontTemplate.accent }];
    for (const id of visibleSections) {
      const meta = SECTIONS[id];
      const template = resolveTemplate(TEMPLATES[meta.templateId] || TEMPLATES[DEFAULT_TEMPLATE_ID], darkMode);
      tabs.push({ id, label: t(lang, `section.${id}`), accent: template.accent });
    }
    return tabs;
  }, [visibleSections, darkMode, lang]);

  useEffect(() => {
    if (activeSection !== FRONT_PAGE_ID && !visibleSections.includes(activeSection)) {
      setActiveSection(FRONT_PAGE_ID);
      setArticle(false);
    }
  }, [visibleSections, activeSection]);

  // Trascinamento laterale sul contenuto per passare alla scheda successiva/
  // precedente, come le schede in alto ma senza dover per forza toccarle —
  // stesso ordine di "Prima Pagina" + sezioni visibili.
  const activeTabIndex = sectionTabs.findIndex((st) => st.id === activeSection);
  const hasNextSection = activeTabIndex >= 0 && activeTabIndex < sectionTabs.length - 1;
  const hasPrevSection = activeTabIndex > 0;
  const goToNextSection = useCallback(() => {
    setActiveSection((prev) => {
      const idx = sectionTabs.findIndex((st) => st.id === prev);
      return idx === -1 || idx >= sectionTabs.length - 1 ? prev : sectionTabs[idx + 1].id;
    });
    setArticle(false);
  }, [sectionTabs]);
  const goToPrevSection = useCallback(() => {
    setActiveSection((prev) => {
      const idx = sectionTabs.findIndex((st) => st.id === prev);
      return idx <= 0 ? prev : sectionTabs[idx - 1].id;
    });
    setArticle(false);
  }, [sectionTabs]);

  // Calcolato indipendentemente dalla scheda attiva (non solo quando si è
  // su Prima Pagina): l'hero di una sezione deve sapere di dover scavalcare
  // quello di Prima Pagina anche se l'utente apre direttamente Attualità
  // senza prima passare da lì.
  const frontPageComposed = useMemo(
    () => composeArticles(allArticles, sourceWeights, { diversify: true }),
    [allArticles, sourceWeights]
  );
  const frontPageHeroIds = useMemo(
    () => new Set(frontPageComposed.hero ? [frontPageComposed.hero.id] : []),
    [frontPageComposed.hero]
  );

  const currentView = useMemo(() => {
    const isFront = activeSection === FRONT_PAGE_ID;
    if (isFront) {
      const sectionMeta = buildSectionMeta(activeSection);
      const template = resolveTemplate(TEMPLATES[sectionMeta.templateId] || TEMPLATES[DEFAULT_TEMPLATE_ID], darkMode);
      return {
        id: sectionMeta.id,
        label: t(lang, sectionMeta.labelKey),
        accent: template.accent,
        paper: template.paper,
        ink: template.ink,
        headlineStyle: template.headlineStyle,
        hero: frontPageComposed.hero ? mapArticle(frontPageComposed.hero, lang) : null,
        secondary: frontPageComposed.secondary.map((a) => mapArticle(a, lang)),
        brief: frontPageComposed.brief.map((a) => ({ title: a.title, tag: a.sourceName || "", link: a.link })),
        stale: frontPageComposed.stale,
      };
    }
    const articles = allArticles.filter((a) => a.section === activeSection);
    const composed = composeArticles(articles, sourceWeights, { diversify: false, excludeHeroIds: frontPageHeroIds });
    const sectionMeta = buildSectionMeta(activeSection);
    const template = resolveTemplate(TEMPLATES[sectionMeta.templateId] || TEMPLATES[DEFAULT_TEMPLATE_ID], darkMode);
    return {
      id: sectionMeta.id,
      label: t(lang, sectionMeta.labelKey),
      accent: template.accent,
      paper: template.paper,
      ink: template.ink,
      headlineStyle: template.headlineStyle,
      hero: composed.hero ? mapArticle(composed.hero, lang) : null,
      secondary: composed.secondary.map((a) => mapArticle(a, lang)),
      brief: composed.brief.map((a) => ({ title: a.title, tag: a.sourceName || "", link: a.link })),
      stale: composed.stale,
    };
  }, [activeSection, allArticles, sourceWeights, darkMode, lang, frontPageComposed, frontPageHeroIds]);

  const paperColor = anyReady ? currentView.paper : chrome.screenBg;

  return (
    <div
      className={IS_FULL_BLEED ? "h-screen flex flex-col overflow-hidden" : "min-h-screen flex items-center justify-center py-8"}
      style={{ backgroundColor: IS_FULL_BLEED ? paperColor : chrome.pageBg, fontFamily: "'Inter', sans-serif" }}
    >
      <style>{FONTS}</style>
      <div
        className={
          IS_FULL_BLEED
            ? "@container flex-1 min-h-0 flex flex-col overflow-hidden"
            : "@container w-[375px] h-[780px] rounded-[36px] overflow-hidden shadow-2xl flex flex-col"
        }
        style={IS_FULL_BLEED ? { backgroundColor: paperColor } : { backgroundColor: paperColor, border: `8px solid ${chrome.bezel}` }}
      >
        {!IS_FULL_BLEED && <StatusBar ink={anyReady ? currentView.ink : chrome.ink} />}

        <ErrorBoundary
          key={`${tab}-${activeSection}-${article}`}
          fallback={
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center" style={{ backgroundColor: chrome.screenBg }}>
              <p className="text-[14px] font-medium" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>
                {t(lang, "errorBoundaryTitle")}
              </p>
              <p className="text-[12.5px]" style={{ color: chrome.ink, opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
                {t(lang, "errorBoundaryMessage")}
              </p>
              <button
                onClick={() => { setTab("front"); setActiveSection(FRONT_PAGE_ID); setArticle(false); }}
                className="mt-1 px-4 py-2 rounded-md text-[12.5px] font-medium"
                style={{ backgroundColor: chrome.ink, color: chrome.screenBg }}
              >
                {t(lang, "errorBoundaryBackButton")}
              </button>
            </div>
          }
        >
          {tab === "front" && !anyReady && (
            <div className="flex-1 flex items-center justify-center px-8 text-center">
              <p className="text-[13px]" style={{ color: chrome.ink, opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
                {feedList.length === 0 ? t(lang, "emptyNoFeeds") : t(lang, "loadingPaper")}
              </p>
            </div>
          )}

          {tab === "front" && anyReady && !article && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden @3xl:mx-auto @3xl:w-full @3xl:max-w-[1100px]">
              <Masthead view={currentView} lang={lang} />
              <SectionTabs
                sectionTabs={sectionTabs}
                activeSection={activeSection}
                onSelect={(id) => { setActiveSection(id); setArticle(false); }}
                view={currentView}
                paperColor={paperColor}
              />
              <PullToRefresh
                onRefresh={refreshAllFeeds}
                refreshing={isRefreshing}
                chrome={chrome}
                accent={currentView.accent}
                lang={lang}
                onSwipeNext={goToNextSection}
                onSwipePrev={goToPrevSection}
                hasNext={hasNextSection}
                hasPrev={hasPrevSection}
              >
                <FrontPage view={currentView} lang={lang} onOpenArticle={() => setArticle(true)} />
              </PullToRefresh>
            </div>
          )}

          {tab === "front" && anyReady && article && (
            <div className="flex-1 overflow-y-auto">
              <ArticleView view={currentView} lang={lang} onBack={() => setArticle(false)} />
            </div>
          )}

          {tab === "feeds" && (
            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: chrome.screenBg }}>
              <FeedsScreen feedList={feedList} sources={sources} onToggle={toggleFeed} onRemove={removeFeed} onAdd={addFeed} onAddPack={addFeedsBulk} onRemovePack={removeFeedsBulk} onImportOpml={importOpml} onWeightChange={changeWeight} chrome={chrome} lang={lang} />
            </div>
          )}

          {tab === "settings" && (
            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: chrome.screenBg }}>
              <SettingsScreen
                hiddenSections={hiddenSections}
                onToggleSection={toggleSectionHidden}
                sectionOrder={sectionOrder}
                onReorderSections={reorderSections}
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
                onClearCache={clearCache}
                chrome={chrome}
                lang={lang}
              />
            </div>
          )}
        </ErrorBoundary>

        {/* Bottom nav */}
        <div className="flex items-center justify-around py-3 border-t" style={{ borderColor: chrome.navBorder, backgroundColor: chrome.navBg }}>
          {[
            { id: "front", label: t(lang, "tabFront"), icon: Newspaper },
            { id: "feeds", label: t(lang, "tabFeeds"), icon: Rss },
            { id: "settings", label: t(lang, "tabSettings"), icon: Settings2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setArticle(false);
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <Icon size={19} color={tab === id ? chrome.ink : `${chrome.ink}66`} />
              <span className="text-[9.5px]" style={{ color: tab === id ? chrome.ink : `${chrome.ink}66` }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
