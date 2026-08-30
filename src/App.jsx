import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { RefreshCw, Rss, Newspaper, Settings2, ArrowLeft, Clock, Plus, X, Loader2, AlertTriangle, ExternalLink, Moon, ChevronUp, ChevronDown, Mail, GripVertical, Trash2 } from "lucide-react";
import { fetchTextWithFallback, parseFeed, discoverFeedUrl } from "./lib/rss";
import { assignSection, composeArticles, isFresh } from "./lib/classify";
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from "./lib/templates";
import { SECTIONS, SECTION_ORDER as DEFAULT_SECTION_ORDER, DEFAULT_SECTION_ID, FRONT_PAGE_ID } from "./lib/sections";
import { CURATED_PACKS } from "./lib/curatedFeeds";
import { searchPublishers } from "./lib/publisherSearch";
import { stripHtml, relativeTime, hashAccentColor } from "./lib/format";
import { resolveLanguage, t } from "./lib/i18n";
import { version as APP_VERSION } from "../package.json";
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

const WEIGHT_LEVELS = [
  { value: 0.5, labelKey: "weightLow" },
  { value: 1, labelKey: "weightNormal" },
  { value: 1.5, labelKey: "weightHigh" },
];

// Accetta anche "corriere.it" oltre a un URL completo, per permettere di
// incollare l'indirizzo di un sito (l'autodiscovery in addFeed troverà il feed).
//
// Il controllo sull'hostname è necessario, non solo prudente: senza,
// digitare una frase qualunque ("il mio giornale di Verona") produceva un
// URL sintatticamente valido (gli spazi diventano %20 nell'hostname) ma
// ovviamente inutile — veniva accettato in silenzio, lasciato fallire dopo
// una lunga attesa e restava in elenco per sempre con un errore tecnico
// incomprensibile (trovato testando con un profilo non tecnico). Un
// hostname vero non contiene spazi/percent-encoding e ha almeno un punto.
function normalizeUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    try {
      url = new URL(`https://${input}`);
    } catch {
      return null;
    }
  }
  if (!/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes(".")) {
    return null;
  }
  return url.href;
}

function mapArticle(a, lang) {
  return {
    ...a,
    kicker: (a.sourceName || "").toUpperCase(),
    dek: stripHtml(a.description).slice(0, 180),
    time: relativeTime(a.pubDate, lang),
  };
}

async function loadFeedData(url, sectionHint) {
  const xml = await fetchTextWithFallback(url);
  const parsed = parseFeed(xml);
  const articles = parsed.articles.map((a) => ({ ...a, section: assignSection(a, sectionHint) }));
  return {
    feedMeta: { title: parsed.title, description: parsed.description, link: parsed.link },
    articles,
  };
}

function buildSectionMeta(id) {
  if (id === FRONT_PAGE_ID) return { id: FRONT_PAGE_ID, labelKey: "frontPage", templateId: DEFAULT_TEMPLATE_ID };
  const section = SECTIONS[id];
  return section ? { id, labelKey: `section.${id}`, templateId: section.templateId } : { id, labelKey: id, templateId: DEFAULT_TEMPLATE_ID };
}

function resolveTemplate(template, dark) {
  if (!dark || !template.dark) return template;
  return { ...template, ...template.dark };
}

// Il nome della testata resta sempre nello stesso font, a differenza dei
// titoli degli articoli (che cambiano stile per sezione, identità
// editoriale voluta): è il logo dell'app, deve restare riconoscibile
// uguale su ogni schermata invece di saltare tra 4 stili diversi cambiando
// sezione.
const MASTHEAD_STYLE = { fontFamily: "'Fraunces', serif", fontWeight: 900, letterSpacing: "0.02em", textTransform: "uppercase" };

// Colori dell'interfaccia (non del "foglio" editoriale, che viene da templates.js):
// masthead della schermata Feed/Impostazioni, card, toggle, sfondo del telefono.
const CHROME_LIGHT = {
  pageBg: "#DDD8CB",
  bezel: "#16140F",
  screenBg: "#EDE8DC",
  ink: "#211D19",
  card: "#FFFFFFAA",
  cardBorder: "#21201C1A",
  divider: "#21201C33",
  chipBg: "#21201C14",
  navBg: "#FBF9F3",
  navBorder: "#00000014",
  success: "#2E6F6A",
  warning: "#C97A2B",
  danger: "#A31E22",
};

const CHROME_DARK = {
  pageBg: "#0C0B09",
  bezel: "#3A3630",
  screenBg: "#1C1815",
  ink: "#EDE6D8",
  card: "#FFFFFF12",
  cardBorder: "#FFFFFF1F",
  divider: "#FFFFFF2E",
  chipBg: "#FFFFFF1A",
  navBg: "#15120F",
  navBorder: "#FFFFFF14",
  success: "#4FA79E",
  warning: "#D89355",
  danger: "#E5636A",
};

function StatusBar({ ink }) {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[11px] font-medium" style={{ color: ink }}>
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-2 border rounded-[1px]" style={{ borderColor: ink }} />
      </span>
    </div>
  );
}

function Masthead({ view, lang }) {
  const today = new Date().toLocaleDateString(lang === "en" ? "en-GB" : "it-IT", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="px-5 pt-2 pb-3">
      <div className="text-center" style={{ ...MASTHEAD_STYLE, fontSize: "22px", lineHeight: 1 }}>
        <span style={{ color: view.ink }}>Aldus</span>
        <span style={{ color: view.accent }}>RSS</span>
      </div>
      <div className="flex items-center justify-center gap-2 mt-1.5">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: view.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
          {today} · {view.label}
        </span>
      </div>
      <div className="mt-2 h-[2px]" style={{ backgroundColor: view.accent }} />
    </div>
  );
}

// Fonti come ANSA non pubblicano mai un'immagine reale nel feed (verificato:
// zero su decine di articoli, sia nel feed principale che in Economia). Al
// posto di una foto stock scelta a caso (sembra sempre "sbagliata", perché
// non ha alcun rapporto col contenuto), un riquadro monocromatico con il nome
// della testata: la sola iniziale (prima versione) risultava "distraente" a
// vedersi ripetuta identica in ogni card senza indicare nulla — il nome per
// esteso resta un placeholder onesto (non finge di essere una foto
// dell'articolo) ma comunica qualcosa di reale, la fonte, invece di una
// lettera vuota (segnalato dall'utente).
function ArticleImage({ src, seed, label, className, style, fontSize = "22px" }) {
  if (src) {
    return <img src={src} alt="" className={className} style={style} />;
  }
  return (
    <div
      className={className}
      style={{ ...style, backgroundColor: hashAccentColor(seed || "?"), display: "flex", alignItems: "center", justifyContent: "center", padding: "10%" }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.92)",
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize,
          lineHeight: 1.15,
          textAlign: "center",
          overflowWrap: "break-word",
        }}
      >
        {label || "?"}
      </span>
    </div>
  );
}

function Kicker({ text, accent }) {
  return (
    <span
      className="inline-block text-[10px] font-bold tracking-widest uppercase px-0"
      style={{ color: accent, fontFamily: "'Inter', sans-serif" }}
    >
      {text}
    </span>
  );
}

// Riga di pill orizzontale scrollabile: su schermi stretti (Android reale) le
// ultime sezioni restano fuori dai bordi senza alcun indizio visivo che ce ne
// sono altre da scorrere (segnalato dall'utente: sembra che la lista sia
// "tagliata"/incompleta). Due sfumature ai bordi, mostrate solo quando c'è
// davvero altro contenuto in quella direzione, comunicano lo scroll possibile.
function SectionTabs({ sectionTabs, activeSection, onSelect, view, paperColor }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateFades();
    window.addEventListener("resize", updateFades);
    return () => window.removeEventListener("resize", updateFades);
  }, [updateFades, sectionTabs]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateFades}
        className="px-5 flex gap-2 pb-3 overflow-x-auto"
      >
        {sectionTabs.map((st) => (
          <button
            key={st.id}
            onClick={() => onSelect(st.id)}
            className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-wide transition-colors shrink-0"
            style={{
              backgroundColor: activeSection === st.id ? st.accent : "transparent",
              color: activeSection === st.id ? "#fff" : view.ink,
              opacity: activeSection === st.id ? 1 : 0.5,
              border: `1px solid ${activeSection === st.id ? st.accent : `${view.ink}33`}`,
            }}
          >
            {st.label}
          </button>
        ))}
      </div>
      {canScrollLeft && (
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-3 w-6"
          style={{ background: `linear-gradient(to right, ${paperColor}, transparent)` }}
        />
      )}
      {canScrollRight && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-3 w-6"
          style={{ background: `linear-gradient(to left, ${paperColor}, transparent)` }}
        />
      )}
    </div>
  );
}

function FrontPage({ view, lang, onOpenArticle }) {
  if (!view.hero) {
    return (
      <div className="px-5 pb-6 pt-8 text-center">
        <p className="text-[13px]" style={{ color: view.ink, opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
          {t(lang, "frontEmptySection")}
        </p>
      </div>
    );
  }
  return (
    <div className="px-5 pb-6 @3xl:px-8">
      {view.stale && (
        <p className="mb-3 text-[11px] flex items-center gap-1.5" style={{ color: view.ink, opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
          <AlertTriangle size={12} /> {t(lang, "noFreshArticles")}
        </p>
      )}
      {/* Sotto i ~768px di contenitore (telefono, sia reale che demo) resta tutto
          impilato in colonna com'era. Da @3xl in su (solo la finestra desktop
          Electron è realmente così larga: la demo browser e i telefoni reali
          restano entrambi sotto soglia) hero+secondaria affiancano "in breve"
          come una vera prima pagina di giornale invece di un'unica colonna
          verticale lunghissima. */}
      <div className="@3xl:flex @3xl:gap-8 @3xl:items-start">
        <div className="@3xl:flex-1 @3xl:min-w-0">
          {/* Hero */}
          <button className="block w-full text-left" onClick={onOpenArticle}>
            <ArticleImage
              key={view.hero.link}
              src={view.hero.image}
              seed={view.hero.sourceId}
              label={view.hero.kicker}
              fontSize="28px"
              className="w-full aspect-[4/3] object-cover"
              style={{ animation: "aldusPhotoIn 360ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
            />
            <div className="mt-3">
              <Kicker text={view.hero.kicker} accent={view.accent} />
              <h1
                className="mt-1"
                style={{ ...view.headlineStyle, color: view.ink, fontSize: "28px", lineHeight: 1.08 }}
              >
                {view.hero.title}
              </h1>
              <p className="mt-2 text-[14px]" style={{ color: view.ink, opacity: 0.75, fontFamily: "'Inter', sans-serif" }}>
                {view.hero.dek}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: view.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
                {view.hero.author && (
                  <>
                    <span>{view.hero.author}</span>
                    <span>·</span>
                  </>
                )}
                <Clock size={11} />
                <span>{view.hero.time}</span>
              </div>
            </div>
          </button>

          {view.secondary.length > 0 && (
            <>
              <div className="mt-5 h-px" style={{ backgroundColor: view.ink, opacity: 0.15 }} />
              <div className="grid grid-cols-2 gap-4 mt-5 @3xl:grid-cols-3">
                {view.secondary.map((item) => (
                  <a key={item.link} href={item.link} target="_blank" rel="noreferrer" className="block">
                    <ArticleImage
                      key={item.link}
                      src={item.image}
                      seed={item.sourceId}
                      label={item.kicker}
                      fontSize="14px"
                      className="w-full aspect-[5/4] object-cover"
                      style={{ animation: "aldusPhotoIn 360ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
                    />
                    <Kicker text={item.kicker} accent={view.accent} />
                    <h3 className="mt-1" style={{ ...view.headlineStyle, color: view.ink, fontSize: "15px", lineHeight: 1.15 }}>
                      {item.title}
                    </h3>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>

        {view.brief.length > 0 && (
          <div className="@3xl:w-[280px] @3xl:shrink-0">
            <div className="mt-5 h-px @3xl:hidden" style={{ backgroundColor: view.ink, opacity: 0.15 }} />
            <div className="mt-5 @3xl:mt-0 @3xl:pl-8 @3xl:border-l" style={{ borderColor: `${view.ink}22` }}>
              <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: view.ink, fontFamily: "'Inter', sans-serif" }}>
                In breve
              </span>
              <div className="mt-2 divide-y" style={{ borderColor: `${view.ink}22` }}>
                {view.brief.map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 flex items-start gap-2"
                    style={{ borderTopWidth: i === 0 ? 0 : "1px", borderColor: `${view.ink}1F` }}
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: view.accent }} />
                    <div>
                      <p className="text-[13.5px]" style={{ color: view.ink, fontFamily: "'Inter', sans-serif" }}>{item.title}</p>
                      {item.tag && (
                        <span className="text-[10.5px] uppercase tracking-wide" style={{ color: view.ink, opacity: 0.5, fontFamily: "'Inter', sans-serif" }}>{item.tag}</span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PULL_THRESHOLD = 70;
// Oltre la soglia il dito può continuare a scorrere ben più a lungo di
// quanto valga la pena mostrare: senza un limite via via più "duro" (elastico,
// non un taglio secco) il gesto sembra un semplice spostamento del contenuto
// invece che un trascinamento con resistenza — la sensazione "scattosa"
// segnalata su dispositivo reale. Oltre la soglia il movimento del dito
// continua a contare, solo molto attenuato.
const PULL_RUBBER_BAND = 0.42;
const INDICATOR_REST_HEIGHT = 56;

// Zona morta prima di decidere se un gesto è verticale (pull-to-refresh /
// scroll) o orizzontale (cambio sezione): senza, un trascinamento quasi
// dritto ma con un filo di deriva nell'altro asse veniva interpretato in
// modo ambiguo o addirittura in entrambi i modi. Il gesto resta "indeciso"
// (nessun effetto) finché non supera questa distanza in una direzione
// chiaramente prevalente.
const SWIPE_LOCK_DISTANCE = 10;
// Soglia di trascinamento orizzontale per cambiare sezione, e durata/curva
// dell'animazione di uscita+ingresso quando scatta il cambio — la stessa
// che già anima le immagini (aldusPhotoIn in FONTS), per coerenza.
const SWIPE_THRESHOLD = 60;
const SWIPE_TRANSITION_MS = 220;
// Resistenza quando si trascina oltre l'ultima sezione o prima di "Prima
// Pagina": stesso principio del rimbalzo elastico verticale (vedi
// PULL_RUBBER_BAND), per far sentire che non c'è altro da quel lato invece
// di un trascinamento che semplicemente non fa nulla.
const SWIPE_RUBBER_BAND = 0.35;

// Gestisce sia l'aggiornamento con trascinamento verso il basso sia il
// cambio sezione con trascinamento laterale — un solo set di listener touch
// nativi per evitare che i due gesti si accavallino o si rubino a vicenda
// gli eventi (vedi sotto per il perché non bastano i gestori onPointer* di
// React).
//
// Il listener touchmove non passivo è essenziale, non opzionale: senza, il
// WebView Android riconosce il gesto come scroll/bounce nativo dopo pochi
// pixel e smette di consegnare eventi a React, qualunque sia la distanza
// reale del trascinamento (verificato su emulatore reale).
function PullToRefresh({ onRefresh, refreshing, chrome, accent, lang, onSwipeNext, onSwipePrev, hasNext, hasPrev, children }) {
  const [pull, setPull] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const trackingRef = useRef(false);
  const axisRef = useRef(null); // null finché indeciso, poi "v" o "h" per l'intero gesto
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pullRef = useRef(0);
  const dragXRef = useRef(0);
  const scrollElRef = useRef(null);
  const wasRefreshingRef = useRef(refreshing);
  const gestureRef = useRef({ onSwipeNext, onSwipePrev, hasNext, hasPrev });
  useLayoutEffect(() => {
    gestureRef.current = { onSwipeNext, onSwipePrev, hasNext, hasPrev };
  });

  // Quando l'aggiornamento avviato dal gesto finisce, richiude l'indicatore:
  // mentre `refreshing` è true l'altezza segue lui, non `pull` (vedi
  // `indicatorHeight` sotto), quindi va comunque azzerato per quando torna a
  // false, altrimenti l'indicatore resterebbe aperto in modo permanente.
  useEffect(() => {
    if (wasRefreshingRef.current && !refreshing) {
      pullRef.current = 0;
      setPull(0);
    }
    wasRefreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const el = scrollElRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (refreshing) return;
      const touch = e.touches[0];
      if (!touch) return;
      axisRef.current = null;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
    }

    // `trackingRef` da solo non basta come condizione per il pull verticale:
    // si attiverebbe su qualunque tocco che inizia a scrollTop 0, incluso un
    // normale scroll verso il basso (dito che scorre verso l'alto) fatto
    // partendo dalla cima della pagina — bloccarlo sempre rompeva lo scroll
    // ogni volta che si iniziava a toccare dall'inizio del contenuto (bug
    // reale trovato testando su dispositivo). Va soppresso solo il vero
    // trascinamento verso il basso, deciso qui in autonomia dalle coordinate
    // touch.
    function onTouchMove(e) {
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      if (axisRef.current === null) {
        if (Math.hypot(dx, dy) < SWIPE_LOCK_DISTANCE) return;
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (axisRef.current === "v") {
          trackingRef.current = el.scrollTop === 0 && dy > 0;
          if (trackingRef.current) setIsTracking(true);
        } else {
          setSwiping(true);
        }
      }

      if (axisRef.current === "h") {
        e.preventDefault();
        const { hasNext, hasPrev } = gestureRef.current;
        const resisted = (dx < 0 && !hasNext) || (dx > 0 && !hasPrev);
        const next = resisted ? dx * SWIPE_RUBBER_BAND : dx;
        dragXRef.current = next;
        setDragX(next);
        return;
      }

      if (!trackingRef.current) return;
      if (el.scrollTop > 0) {
        trackingRef.current = false;
        setIsTracking(false);
        pullRef.current = 0;
        setPull(0);
        setCommitted(false);
        return;
      }
      e.preventDefault();
      const next =
        dy <= 0 ? 0 : dy <= PULL_THRESHOLD ? dy : PULL_THRESHOLD + (dy - PULL_THRESHOLD) * PULL_RUBBER_BAND;
      pullRef.current = next;
      setPull(next);
      setCommitted(next >= PULL_THRESHOLD);
    }

    function onTouchEnd() {
      if (axisRef.current === "h") {
        setSwiping(false);
        const dx = dragXRef.current;
        const { onSwipeNext, onSwipePrev, hasNext, hasPrev } = gestureRef.current;
        const exitDistance = (el.clientWidth || 400) + 40;
        if (dx <= -SWIPE_THRESHOLD && hasNext) {
          setDragX(-exitDistance);
          window.setTimeout(() => {
            onSwipeNext();
            setDragX(0);
          }, SWIPE_TRANSITION_MS);
        } else if (dx >= SWIPE_THRESHOLD && hasPrev) {
          setDragX(exitDistance);
          window.setTimeout(() => {
            onSwipePrev();
            setDragX(0);
          }, SWIPE_TRANSITION_MS);
        } else {
          setDragX(0);
        }
        dragXRef.current = 0;
      } else if (axisRef.current === "v" && trackingRef.current) {
        trackingRef.current = false;
        setIsTracking(false);
        const shouldRefresh = pullRef.current >= PULL_THRESHOLD;
        if (shouldRefresh) onRefresh();
        pullRef.current = 0;
        setCommitted(false);
        // Se parte l'aggiornamento, l'altezza resta quella "a riposo" (guidata
        // da `refreshing`) invece di azzerarsi: azzerare qui e lasciare che
        // `refreshing` la riporti su un istante dopo produceva un salto
        // visibile giù-e-su, invece di una transizione continua verso
        // l'icona che gira.
        setPull(shouldRefresh ? INDICATOR_REST_HEIGHT : 0);
      }
      axisRef.current = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [refreshing, onRefresh]);

  const progress = Math.min(pull / PULL_THRESHOLD, 1);
  const indicatorHeight = refreshing ? INDICATOR_REST_HEIGHT : pull;
  // "Rilascia per aggiornare" ha senso solo mentre si sta ancora trascinando:
  // un aggiornamento avviato dal bottone in alto (non da un pull) passa
  // comunque per `refreshing`, e mostrare "rilascia" in quel caso non
  // avrebbe senso (l'utente non ha trascinato nulla).
  const label = refreshing ? t(lang, "refreshingLabel") : committed ? t(lang, "releaseToRefresh") : t(lang, "pullToRefresh");

  return (
    <div ref={scrollElRef} className="flex-1 overflow-y-auto" style={{ overscrollBehaviorY: "contain" }}>
      <div
        className="flex flex-col items-center justify-center gap-1"
        style={{ height: indicatorHeight, overflow: "hidden", transition: isTracking ? "none" : "height 260ms cubic-bezier(0.34, 1.2, 0.4, 1)" }}
      >
        {(pull > 4 || refreshing) && (
          <>
            <RefreshCw
              size={18}
              color={committed || refreshing ? accent : chrome.ink}
              className={refreshing ? "animate-spin" : ""}
              style={
                refreshing
                  ? undefined
                  : { transform: `rotate(${progress * 360}deg) scale(${0.7 + progress * 0.3})`, opacity: Math.max(progress, 0.35) }
              }
            />
            <span
              className="text-[10.5px] font-semibold uppercase tracking-wide"
              style={{ color: committed || refreshing ? accent : chrome.ink, opacity: committed || refreshing ? 1 : 0.55 }}
            >
              {label}
            </span>
          </>
        )}
      </div>
      <div
        style={{
          transform: `translateX(${dragX}px)`,
          transition: swiping ? "none" : `transform ${SWIPE_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ArticleView({ view, lang, onBack }) {
  return (
    <div className="px-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 py-3 text-[13px]" style={{ color: view.ink, fontFamily: "'Inter', sans-serif" }}>
        <ArrowLeft size={16} />
        {view.label}
      </button>
      <ArticleImage
        src={view.hero.image}
        seed={view.hero.sourceId}
        label={view.hero.kicker}
        fontSize="28px"
        className="w-full aspect-[4/3] object-cover"
      />
      <Kicker text={view.hero.kicker} accent={view.accent} />
      <h1 className="mt-2" style={{ ...view.headlineStyle, color: view.ink, fontSize: "26px", lineHeight: 1.1 }}>
        {view.hero.title}
      </h1>
      <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: view.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
        {view.hero.author && (
          <>
            <span>{view.hero.author}</span>
            <span>·</span>
          </>
        )}
        <Clock size={11} />
        <span>{view.hero.time}</span>
      </div>
      <div className="mt-4 space-y-3">
        {stripHtml(view.hero.description).split(/\n\n+/).filter(Boolean).map((p, i) => (
          <p key={i} className="text-[15px] leading-relaxed" style={{ color: view.ink, opacity: 0.88, fontFamily: "'Inter', sans-serif" }}>
            {p}
          </p>
        ))}
      </div>
      {view.hero.link && (
        <a
          href={view.hero.link}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium"
          style={{ color: view.accent, fontFamily: "'Inter', sans-serif" }}
        >
          {t(lang, "readOriginal")} <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

function FeedsScreen({ feedList, sources, onToggle, onRemove, onAdd, onAddPack, onRemovePack, onWeightChange, chrome, lang }) {
  const [adding, setAdding] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [addError, setAddError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [addingPackId, setAddingPackId] = useState(null);

  // Ricerca "per nome" tra le testate già conosciute (default + pacchetti
  // curati): richiesta dai tester per non dover cercare a mano l'indirizzo
  // di siti come "Il Resto del Carlino" o "Sky Sport". Copre solo le fonti
  // che l'app conosce già — per tutte le altre resta il flusso normale
  // (incolla l'indirizzo, autodiscovery). Vedi src/lib/publisherSearch.js.
  const suggestions = useMemo(() => searchPublishers(urlInput), [urlInput]);

  async function handleSelectSuggestion(entry) {
    if (feedList.some((f) => f.url === entry.url)) {
      setAddError(t(lang, "errorDuplicateFeed"));
      return;
    }
    setAddError("");
    setSubmitting(true);
    try {
      await onAdd(entry.url, entry.label);
      setUrlInput("");
      setAdding(false);
    } catch {
      setAddError(t(lang, "errorNoFeedFound"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddPack(pack) {
    setAddingPackId(pack.id);
    await onAddPack(pack.feeds);
    setAddingPackId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;
    const url = normalizeUrl(raw);
    if (!url) {
      setAddError(t(lang, "errorInvalidUrl"));
      return;
    }
    if (feedList.some((f) => f.url === url)) {
      setAddError(t(lang, "errorDuplicateFeed"));
      return;
    }
    setAddError("");
    setSubmitting(true);
    try {
      await onAdd(url);
      setUrlInput("");
      setAdding(false);
    } catch {
      // Il form resta aperto con un errore chiaro invece di chiudersi come se
      // fosse andato tutto bene: prima una fonte introvabile veniva comunque
      // aggiunta all'elenco, dove falliva in silenzio con un messaggio tecnico
      // solo minuti dopo (trovato testando con un profilo non tecnico).
      setAddError(t(lang, "errorNoFeedFound"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 pt-4 pb-8">
      <h2 className="text-[20px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: chrome.ink }}>{t(lang, "feedsTitle")}</h2>
      <p className="text-[12.5px] mt-1 mb-4" style={{ color: chrome.ink, opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
        {t(lang, "feedsSubtitle")}
      </p>
      <div className="space-y-2.5">
        {feedList.map((f) => {
          const s = sources[f.id];
          const label = f.label || s?.feedMeta?.title || f.url;
          return (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-lg gap-2" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-md flex items-center justify-center text-[13px] font-bold" style={{ backgroundColor: chrome.chipBg, color: chrome.ink, fontFamily: "'Fraunces', serif" }}>
                  {label[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>{label}</p>
                  {s?.status === "loading" && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: `${chrome.ink}88` }}>
                      <Loader2 size={11} className="animate-spin" /> {t(lang, "statusLoading")}
                    </span>
                  )}
                  {s?.status === "error" && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: chrome.danger }}>
                      <AlertTriangle size={11} /> {s.errorMessage || t(lang, "statusErrorFallback")}
                    </span>
                  )}
                  {s?.status === "stale" && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: chrome.warning }}>
                      <AlertTriangle size={11} /> {t(lang, "statusStale")}
                    </span>
                  )}
                  {s?.status === "ready" && Array.isArray(s.articles) && s.articles.length > 0 && !s.articles.some(isFresh) && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: chrome.warning }}>
                      <AlertTriangle size={11} /> {t(lang, "statusNoFreshContent")}
                    </span>
                  )}
                  {s?.status === "ready" && (
                    <p className="text-[11.5px] truncate" style={{ color: chrome.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>{f.url}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${chrome.cardBorder}` }}>
                  {WEIGHT_LEVELS.map((level) => {
                    const active = (f.weight ?? 1) === level.value;
                    return (
                      <button
                        key={level.value}
                        onClick={() => onWeightChange(f.id, level.value)}
                        title={t(lang, level.labelKey)}
                        className="w-6 h-6 flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: active ? chrome.success : "transparent", color: active ? "#fff" : chrome.ink, opacity: active ? 1 : 0.5 }}
                      >
                        {t(lang, level.labelKey)[0]}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => onToggle(f.id)}
                  className="w-9 h-5 rounded-full relative transition-colors"
                  style={{ backgroundColor: f.enabled ? chrome.success : chrome.divider }}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.enabled ? "18px" : "2px" }} />
                </button>
                <button
                  onClick={() => { if (window.confirm(`${t(lang, "confirmRemoveFeed")} "${label}"?`.trim())) onRemove(f.id); }}
                  className="p-1.5"
                  aria-label="Rimuovi feed"
                >
                  <X size={15} color={`${chrome.ink}88`} />
                </button>
              </div>
            </div>
          );
        })}

        <div className="mt-1">
          <button
            onClick={() => setDiscoverOpen((v) => !v)}
            className="w-full py-2.5 rounded-lg text-[12.5px] font-medium flex items-center justify-center gap-1.5"
            style={{ color: chrome.ink, opacity: 0.75, fontFamily: "'Inter', sans-serif" }}
          >
            {discoverOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {t(lang, "discoverFeedsButton")}
          </button>
          {discoverOpen && (
            <div className="space-y-2 mt-1">
              <p className="text-[11.5px] px-1" style={{ color: chrome.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
                {t(lang, "discoverFeedsHint")}
              </p>
              {CURATED_PACKS.map((pack) => {
                const existingUrls = new Set(feedList.map((f) => f.url));
                const newCount = pack.feeds.filter((cf) => !existingUrls.has(cf.url)).length;
                const isAdding = addingPackId === pack.id;
                return (
                  <div key={pack.id} className="p-3 rounded-lg" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>
                          {pack.label[lang] || pack.label.it}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: chrome.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
                          {pack.feeds.map((f) => f.label).join(" · ")}
                        </p>
                      </div>
                      {newCount === 0 ? (
                        // Prima era un "Già aggiunte" grigio e inerte: per
                        // togliere un intero pacchetto bisognava rimuovere
                        // ogni fonte una per una dalla X della riga
                        // (segnalato dall'utente come scomodo per i
                        // pacchetti più lunghi, es. Nerd con 6 fonti).
                        <button
                          onClick={() => {
                            const label = pack.label[lang] || pack.label.it;
                            if (window.confirm(`${t(lang, "confirmRemoveFeed")} "${label}"?`)) {
                              onRemovePack(pack.feeds.map((f) => f.url));
                            }
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-md text-[11.5px] font-medium border"
                          style={{ borderColor: chrome.danger, color: chrome.danger }}
                        >
                          {t(lang, "packRemoveAll")}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddPack(pack)}
                          disabled={isAdding}
                          className="shrink-0 px-3 py-1.5 rounded-md text-[11.5px] font-medium flex items-center gap-1.5"
                          style={{ backgroundColor: chrome.ink, color: chrome.screenBg, opacity: isAdding ? 0.45 : 1 }}
                        >
                          {isAdding && <Loader2 size={12} className="animate-spin" />}
                          {t(lang, "packAddAll")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {adding ? (
          <form onSubmit={handleSubmit} className="p-3 rounded-lg border border-dashed" style={{ borderColor: chrome.divider }}>
            <input
              autoFocus
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t(lang, "feedUrlPlaceholder")}
              className="w-full text-[13px] px-2.5 py-2 rounded-md outline-none"
              style={{ backgroundColor: chrome.card, color: chrome.ink, border: `1px solid ${chrome.divider}` }}
            />
            {suggestions.length > 0 && (
              <div className="mt-1.5 rounded-md overflow-hidden" style={{ border: `1px solid ${chrome.divider}` }}>
                {suggestions.map((entry, i) => (
                  <button
                    key={entry.url}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSelectSuggestion(entry)}
                    className="w-full text-left px-2.5 py-2 text-[13px] flex items-center gap-2"
                    style={{
                      backgroundColor: chrome.card,
                      color: chrome.ink,
                      opacity: submitting ? 0.5 : 1,
                      borderTop: i === 0 ? "none" : `1px solid ${chrome.divider}`,
                    }}
                  >
                    <Rss size={13} style={{ opacity: 0.5 }} />
                    {entry.label}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[11px]" style={{ color: chrome.ink, opacity: 0.5 }}>{t(lang, "feedAddHint")}</p>
            {addError && <p className="mt-1.5 text-[11.5px]" style={{ color: chrome.danger }}>{addError}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 rounded-md text-[12.5px] font-medium flex items-center justify-center gap-1.5"
                style={{ backgroundColor: chrome.ink, color: chrome.screenBg, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                {t(lang, "addButton")}
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setAddError(""); setUrlInput(""); }}
                className="px-3 py-2 rounded-md text-[12.5px] font-medium"
                style={{ color: `${chrome.ink}AA`, border: `1px solid ${chrome.divider}` }}
              >
                {t(lang, "cancelButton")}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full mt-1 py-3 rounded-lg text-[13px] font-medium border border-dashed flex items-center justify-center gap-1.5"
            style={{ color: `${chrome.ink}AA`, borderColor: chrome.divider, fontFamily: "'Inter', sans-serif" }}
          >
            <Plus size={14} /> {t(lang, "addFeedButton")}
          </button>
        )}
      </div>

      <div className="mt-4 text-center">
        <a
          href="https://andreacorinti.github.io/aldusrss/blocked-feeds.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px]"
          style={{ color: chrome.ink, opacity: 0.45, fontFamily: "'Inter', sans-serif" }}
        >
          {t(lang, "blockedFeedsLinkLabel")} <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

function arrayMove(arr, from, to) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// Un primo trascinamento vero (Pointer Events) era stato tentato e poi
// tolto: sul dispositivo reale risultava poco maneggevole (mani grandi,
// telefono piccolo, bersaglio di trascinamento piccolo) — restavano solo le
// frecce su/giù. Questo secondo tentativo tiene le frecce come alternativa
// sempre presente (chi preferisce toccare due volte invece di trascinare con
// precisione può continuare a farlo esattamente come prima) e aggiunge il
// trascinamento tramite una maniglia dedicata e grande (44px), non l'intera
// riga — così un tocco impreciso non lo attiva per sbaglio. Lo spostamento
// durante il trascinamento è calcolato sulla distanza reale misurata tra le
// righe (non un valore fisso in pixel), così si adatta anche a chi tiene un
// testo di sistema più grande per accessibilità — un dito tremolante che si
// sposta di pochi pixel non fa scattare uno scambio, serve superare metà
// della distanza fino alla riga vicina.
function ReorderableSectionsList({ sectionOrder, hiddenSections, onToggleSection, onReorderSections, chrome, lang }) {
  const [order, setOrder] = useState(sectionOrder);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const itemRefs = useRef({});
  const dragRef = useRef(null);
  const prevRectsRef = useRef({});

  useEffect(() => {
    if (!draggingId) setOrder(sectionOrder);
  }, [sectionOrder, draggingId]);

  // FLIP: le righe che cambiano posizione perché ne è stata trascinata
  // un'altra scivolano al posto nuovo invece di saltarci di colpo.
  useLayoutEffect(() => {
    const prev = prevRectsRef.current;
    for (const id of order) {
      if (id === draggingId) continue;
      const el = itemRefs.current[id];
      if (!el) continue;
      const prevRect = prev[id];
      const nextRect = el.getBoundingClientRect();
      if (prevRect) {
        const dy = prevRect.top - nextRect.top;
        if (dy) {
          el.style.transition = "none";
          el.style.transform = `translateY(${dy}px)`;
          requestAnimationFrame(() => {
            el.style.transition = "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)";
            el.style.transform = "";
          });
        }
      }
    }
    const next = {};
    for (const id of order) {
      const el = itemRefs.current[id];
      if (el) next[id] = el.getBoundingClientRect();
    }
    prevRectsRef.current = next;
  }, [order, draggingId]);

  function move(id, direction) {
    const idx = sectionOrder.indexOf(id);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= sectionOrder.length) return;
    const next = [...sectionOrder];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    onReorderSections(next);
  }

  function handleDragPointerDown(e, id) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const startOrder = sectionOrder;
    const rects = startOrder.map((sid) => itemRefs.current[sid]?.getBoundingClientRect());
    if (rects.some((r) => !r)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startIndex = startOrder.indexOf(id);
    const step = rects.length > 1 ? (rects[rects.length - 1].top - rects[0].top) / (rects.length - 1) : 0;
    dragRef.current = { pointerId: e.pointerId, id, startY: e.clientY, startOrder, startIndex, step, lastTarget: startIndex };
    setDraggingId(id);
    setDragOffset(0);
    try { navigator.vibrate?.(8); } catch {}
  }

  // Soglia di isteresi (0.65 di una riga) invece di un semplice arrotondamento
  // al 50%: senza, una mano poco ferma vicino al confine tra due righe faceva
  // scambiare l'ordine avanti e indietro di continuo ("sbattimento"),
  // percepito come poco preciso e troppo reattivo (segnalato dall'utente).
  // Confrontare sempre con l'ultimo bersaglio raggiunto, non con la
  // posizione di partenza, rende lo scambio "appiccicoso": serve superare la
  // soglia di nuovo per tornare indietro, non basta un tremolio di un pixel.
  const DRAG_SWAP_THRESHOLD = 0.65;

  function handleDragPointerMove(e) {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    const rawDy = e.clientY - drag.startY;
    if (drag.step > 0) {
      const floatIndex = drag.startIndex + rawDy / drag.step;
      let target = drag.lastTarget;
      while (floatIndex - target > DRAG_SWAP_THRESHOLD && target < drag.startOrder.length - 1) target++;
      while (floatIndex - target < -DRAG_SWAP_THRESHOLD && target > 0) target--;
      if (target !== drag.lastTarget) {
        drag.lastTarget = target;
        const newOrder = arrayMove(drag.startOrder, drag.startIndex, target);
        setOrder((current) => {
          if (current.length === newOrder.length && current.every((v, i) => v === newOrder[i])) return current;
          return newOrder;
        });
      }
      setDragOffset(rawDy - (drag.lastTarget - drag.startIndex) * drag.step);
    } else {
      setDragOffset(rawDy);
    }
  }

  function endDrag(e) {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    setDraggingId(null);
    setDragOffset(0);
    // Il rettangolo registrato per questa riga durante il trascinamento
    // includeva ancora il transform di dragOffset: al rilascio, l'effetto
    // FLIP la trattava come "appena spostata" rispetto a quella posizione
    // fantasma e la animava indietro, producendo un rimbalzo su/giù visibile
    // proprio nell'istante del rilascio (segnalato dall'utente). Cancellando
    // il rettangolo registrato, l'effetto la tratta come una riga senza
    // storico e non applica nessuna compensazione: resta ferma dov'è.
    delete prevRectsRef.current[drag.id];
    onReorderSections(order);
  }

  return (
    <>
      {order.map((id, idx) => {
        const visible = !hiddenSections.includes(id);
        const atTop = idx === 0;
        const atBottom = idx === order.length - 1;
        const isDragging = draggingId === id;
        return (
          <div
            key={id}
            ref={(el) => { if (el) itemRefs.current[id] = el; }}
            className="flex items-center justify-between text-[13px]"
            style={{
              color: chrome.ink,
              fontFamily: "'Inter', sans-serif",
              transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
              transition: isDragging ? "none" : undefined,
              position: "relative",
              zIndex: isDragging ? 10 : "auto",
              backgroundColor: isDragging ? chrome.card : "transparent",
              boxShadow: isDragging ? "0 6px 16px rgba(0,0,0,0.18)" : "none",
              borderRadius: isDragging ? "10px" : 0,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                onPointerDown={(e) => handleDragPointerDown(e, id)}
                onPointerMove={handleDragPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                role="button"
                tabIndex={-1}
                aria-hidden="true"
                aria-label={t(lang, "sectionDragHandle")}
                className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: chrome.chipBg, touchAction: "none", cursor: "grab" }}
              >
                <GripVertical size={19} color={chrome.ink} style={{ opacity: 0.6 }} />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => move(id, -1)}
                  disabled={atTop}
                  aria-label={t(lang, "sectionMoveUp")}
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: chrome.chipBg, opacity: atTop ? 0.35 : 1 }}
                >
                  <ChevronUp size={19} color={chrome.ink} />
                </button>
                <button
                  onClick={() => move(id, 1)}
                  disabled={atBottom}
                  aria-label={t(lang, "sectionMoveDown")}
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: chrome.chipBg, opacity: atBottom ? 0.35 : 1 }}
                >
                  <ChevronDown size={19} color={chrome.ink} />
                </button>
              </div>
              <span>{t(lang, `section.${id}`)}</span>
            </div>
            <button
              onClick={() => onToggleSection(id)}
              className="w-9 h-5 rounded-full relative shrink-0"
              style={{ backgroundColor: visible ? chrome.success : chrome.divider }}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: visible ? "18px" : "2px" }} />
            </button>
          </div>
        );
      })}
    </>
  );
}

function SettingsScreen({ hiddenSections, onToggleSection, sectionOrder, onReorderSections, darkMode, onToggleDarkMode, onClearCache, chrome, lang }) {
  const [clearing, setClearing] = useState(false);
  const [justCleared, setJustCleared] = useState(false);

  async function handleClearCache() {
    if (!window.confirm(t(lang, "clearCacheConfirm"))) return;
    setClearing(true);
    setJustCleared(false);
    try {
      await onClearCache();
      setJustCleared(true);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="px-5 pt-4 pb-8">
      <h2 className="text-[20px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: chrome.ink }}>{t(lang, "tabSettings")}</h2>

      <div className="mt-4 p-4 rounded-lg space-y-4" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
        <button onClick={onToggleDarkMode} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon size={15} color={chrome.ink} />
            <p className="text-[14px] font-medium" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>{t(lang, "darkModeLabel")}</p>
          </div>
          <span
            className="w-9 h-5 rounded-full relative shrink-0"
            style={{ backgroundColor: darkMode ? chrome.success : chrome.divider }}
          >
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: darkMode ? "18px" : "2px" }} />
          </span>
        </button>
      </div>

      <div className="mt-3 p-4 rounded-lg space-y-3" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
        <div>
          <p className="text-[14px] font-medium" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>{t(lang, "sectionsVisibleTitle")}</p>
          <p className="text-[12px] mt-0.5" style={{ color: chrome.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>{t(lang, "sectionsVisibleSubtitle")}</p>
        </div>
        <ReorderableSectionsList
          sectionOrder={sectionOrder}
          hiddenSections={hiddenSections}
          onToggleSection={onToggleSection}
          onReorderSections={onReorderSections}
          chrome={chrome}
          lang={lang}
        />
      </div>

      <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
        <p className="text-[12.5px]" style={{ color: chrome.ink, opacity: 0.7, fontFamily: "'Inter', sans-serif" }}>
          {t(lang, "noUnreadNote")}
        </p>
      </div>

      <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
        <p className="text-[14px] font-medium mb-1" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>{t(lang, "clearCacheTitle")}</p>
        <p className="text-[12px] mb-3" style={{ color: chrome.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>{t(lang, "clearCacheSubtitle")}</p>
        <button
          onClick={handleClearCache}
          disabled={clearing}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] font-medium border"
          style={{ borderColor: chrome.divider, color: chrome.ink, opacity: clearing ? 0.6 : 1 }}
        >
          {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {t(lang, "clearCacheButton")}
        </button>
        {justCleared && !clearing && (
          <p className="mt-2 text-[11.5px]" style={{ color: chrome.success }}>{t(lang, "clearCacheDone")}</p>
        )}
      </div>

      <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
        <p className="text-[14px] font-medium mb-1" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>{t(lang, "whatIsRssTitle")}</p>
        <a
          href={lang === "it" ? "https://it.wikipedia.org/wiki/RSS" : "https://en.wikipedia.org/wiki/RSS"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[13px]"
          style={{ color: chrome.ink, opacity: 0.75, fontFamily: "'Inter', sans-serif" }}
        >
          {t(lang, "whatIsRssLinkLabel")} <ExternalLink size={13} />
        </a>
        {lang === "it" && (
          <a
            href="https://www.andreacorinti.com/posts/rss-spiegato/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[13px] mt-1.5"
            style={{ color: chrome.ink, opacity: 0.75, fontFamily: "'Inter', sans-serif" }}
          >
            {t(lang, "whatIsRssSimpleLinkLabel")} <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* Sezione dedicata e chiaramente etichettata, non solo il link al sito
          dello sviluppatore in fondo alla pagina: richiesta esplicita della
          policy Play Store "News and Magazines" (rifiuto ricevuto ad agosto
          2026, motivo "manca una pagina di contatto in-app chiaramente
          etichettata"). Stessa email della pagina Contatti/Privacy sul sito
          (docs/contact.html, docs/privacy.html) — tenerle allineate. */}
      <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
        <p className="text-[14px] font-medium mb-1" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>{t(lang, "contactTitle")}</p>
        <a
          href="mailto:xabacadabra@gmail.com"
          className="flex items-center gap-2 text-[13px]"
          style={{ color: chrome.ink, opacity: 0.75, fontFamily: "'Inter', sans-serif" }}
        >
          <Mail size={14} />
          xabacadabra@gmail.com
        </a>
      </div>

      <div className="mt-6 text-center">
        <a
          href="https://andreacorinti.com"
          target="_blank"
          rel="noreferrer"
          className="text-[11px]"
          style={{ color: chrome.ink, opacity: 0.4, fontFamily: "'Inter', sans-serif" }}
        >
          {t(lang, "creditsLine")}
        </a>
        <p className="text-[10px] mt-1" style={{ color: chrome.ink, opacity: 0.3, fontFamily: "'Inter', sans-serif" }}>
          v{APP_VERSION}
        </p>
        <p className="text-[10px] mt-2 px-4 leading-snug" style={{ color: chrome.ink, opacity: 0.3, fontFamily: "'Inter', sans-serif" }}>
          {t(lang, "betaTestersLine")}
        </p>
      </div>
    </div>
  );
}

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
            <FeedsScreen feedList={feedList} sources={sources} onToggle={toggleFeed} onRemove={removeFeed} onAdd={addFeed} onAddPack={addFeedsBulk} onRemovePack={removeFeedsBulk} onWeightChange={changeWeight} chrome={chrome} lang={lang} />
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
