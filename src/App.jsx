import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { RefreshCw, Rss, Newspaper, Settings2, ArrowLeft, Clock, Plus, X, Loader2, AlertTriangle, ExternalLink, Moon, ChevronUp, ChevronDown } from "lucide-react";
import { fetchTextWithFallback, parseFeed, discoverFeedUrl } from "./lib/rss";
import { assignSection, composeArticles } from "./lib/classify";
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from "./lib/templates";
import { SECTIONS, SECTION_ORDER as DEFAULT_SECTION_ORDER, DEFAULT_SECTION_ID, FRONT_PAGE_ID } from "./lib/sections";
import { stripHtml, relativeTime, placeholderImage } from "./lib/format";
import { LANGUAGES, resolveLanguage, t } from "./lib/i18n";
import {
  loadFeedList,
  saveFeedList,
  loadCache,
  saveSourceCache,
  removeSourceCache,
  loadHiddenSections,
  saveHiddenSections,
  loadSectionOrderPref,
  saveSectionOrderPref,
  loadDarkMode,
  saveDarkMode,
  loadLanguagePref,
  saveLanguagePref,
} from "./lib/storage";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,900;1,9..144,500;1,9..144,700&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap');
`;

// Nel browser (demo) l'app disegna la propria cornice "telefono" (bordo
// arrotondato, status bar finta) per mostrare il layout senza uscire dal
// desktop. Dentro l'app Android/iOS vera è già a schermo intero su un
// telefono reale: quella cornice andrebbe a creare un "telefono nel
// telefono" — va tolta, il contenuto occupa tutto lo schermo.
const IS_NATIVE = Capacitor.isNativePlatform();

const WEIGHT_LEVELS = [
  { value: 0.5, labelKey: "weightLow" },
  { value: 1, labelKey: "weightNormal" },
  { value: 1.5, labelKey: "weightHigh" },
];

// Accetta anche "corriere.it" oltre a un URL completo, per permettere di
// incollare l'indirizzo di un sito (l'autodiscovery in addFeed troverà il feed).
function normalizeUrl(input) {
  try {
    return new URL(input).href;
  } catch {
    try {
      return new URL(`https://${input}`).href;
    } catch {
      return null;
    }
  }
}

function weightLabel(value, lang) {
  const level = WEIGHT_LEVELS.find((w) => w.value === value) || WEIGHT_LEVELS[1];
  return t(lang, level.labelKey);
}

function mapArticle(a, size, lang) {
  return {
    ...a,
    image: a.image || placeholderImage(a.id, size[0], size[1]),
    kicker: (a.sourceName || "").toUpperCase(),
    dek: stripHtml(a.description).slice(0, 180),
    time: relativeTime(a.pubDate, lang),
  };
}

async function loadFeedData(url) {
  const xml = await fetchTextWithFallback(url);
  const parsed = parseFeed(xml);
  const articles = parsed.articles.map((a) => ({ ...a, section: assignSection(a) }));
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

function Masthead({ view, lang, onRefresh, refreshing }) {
  const today = new Date().toLocaleDateString(lang === "en" ? "en-GB" : "it-IT", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="px-5 pt-2 pb-3">
      <div className="flex items-center justify-between">
        <button onClick={onRefresh} disabled={refreshing} className="p-1 -ml-1" aria-label={t(lang, "refreshFeeds")}>
          <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} style={{ color: view.ink }} />
        </button>
        <div className="text-center flex-1" style={{ ...view.mastheadStyle, color: view.ink, fontSize: "22px", lineHeight: 1 }}>
          AldusRSS
        </div>
        <div className="w-7" />
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
    <div className="px-5 pb-6">
      {view.stale && (
        <p className="mb-3 text-[11px] flex items-center gap-1.5" style={{ color: view.ink, opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
          <AlertTriangle size={12} /> {t(lang, "noFreshArticles")}
        </p>
      )}
      {/* Hero */}
      <button className="block w-full text-left" onClick={onOpenArticle}>
        <img src={view.hero.image} alt="" className="w-full aspect-[4/3] object-cover" />
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
          <div className="grid grid-cols-2 gap-4 mt-5">
            {view.secondary.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noreferrer" className="block">
                <img src={item.image} alt="" className="w-full aspect-[5/4] object-cover" />
                <Kicker text={item.kicker} accent={view.accent} />
                <h3 className="mt-1" style={{ ...view.headlineStyle, color: view.ink, fontSize: "15px", lineHeight: 1.15 }}>
                  {item.title}
                </h3>
              </a>
            ))}
          </div>
        </>
      )}

      {view.brief.length > 0 && (
        <>
          <div className="mt-5 h-px" style={{ backgroundColor: view.ink, opacity: 0.15 }} />
          <div className="mt-5">
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
        </>
      )}
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
      <img src={view.hero.image} alt="" className="w-full aspect-[4/3] object-cover" />
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

function FeedsScreen({ feedList, sources, onToggle, onRemove, onAdd, onWeightChange, chrome, lang }) {
  const [adding, setAdding] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [addError, setAddError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    await onAdd(url);
    setSubmitting(false);
    setUrlInput("");
    setAdding(false);
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
          const label = s?.feedMeta?.title || f.url;
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
                  {s?.status === "ready" && (
                    <p className="text-[11.5px] truncate" style={{ color: chrome.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>{f.url}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onWeightChange(f.id)}
                  title={t(lang, "weightTooltip").replace("{weight}", weightLabel(f.weight, lang))}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: chrome.chipBg, color: chrome.ink }}
                >
                  {weightLabel(f.weight, lang)[0]}
                </button>
                <button
                  onClick={() => onToggle(f.id)}
                  className="w-9 h-5 rounded-full relative transition-colors"
                  style={{ backgroundColor: f.enabled ? chrome.success : chrome.divider }}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.enabled ? "18px" : "2px" }} />
                </button>
                <button onClick={() => onRemove(f.id)} className="p-1.5" aria-label="Rimuovi feed">
                  <X size={15} color={`${chrome.ink}88`} />
                </button>
              </div>
            </div>
          );
        })}

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
    </div>
  );
}

// Prima c'era un trascinamento vero (Pointer Events), ma sul dispositivo
// reale è risultato poco maneggevole (mani grandi, telefono piccolo, bersaglio
// di trascinamento piccolo). Due pulsanti su/giù grandi e ben distanziati sono
// meno "eleganti" ma molto più affidabili da toccare con precisione.
function ReorderableSectionsList({ sectionOrder, hiddenSections, onToggleSection, onReorderSections, chrome, lang }) {
  function move(id, direction) {
    const idx = sectionOrder.indexOf(id);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= sectionOrder.length) return;
    const next = [...sectionOrder];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    onReorderSections(next);
  }

  return (
    <>
      {sectionOrder.map((id, idx) => {
        const visible = !hiddenSections.includes(id);
        const atTop = idx === 0;
        const atBottom = idx === sectionOrder.length - 1;
        return (
          <div key={id} className="flex items-center justify-between text-[13px]" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>
            <div className="flex items-center gap-3">
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

function SettingsScreen({ hiddenSections, onToggleSection, sectionOrder, onReorderSections, darkMode, onToggleDarkMode, languagePref, onLanguageChange, chrome, lang }) {
  return (
    <div className="px-5 pt-4 pb-8">
      <h2 className="text-[20px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: chrome.ink }}>{t(lang, "tabSettings")}</h2>

      <div className="mt-4 p-4 rounded-lg space-y-4" style={{ backgroundColor: chrome.card, border: `1px solid ${chrome.cardBorder}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon size={15} color={chrome.ink} />
            <p className="text-[14px] font-medium" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>{t(lang, "darkModeLabel")}</p>
          </div>
          <button
            onClick={onToggleDarkMode}
            className="w-9 h-5 rounded-full relative shrink-0"
            style={{ backgroundColor: darkMode ? chrome.success : chrome.divider }}
          >
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: darkMode ? "18px" : "2px" }} />
          </button>
        </div>

        <div className="pt-3" style={{ borderTop: `1px solid ${chrome.cardBorder}` }}>
          <p className="text-[14px] font-medium" style={{ color: chrome.ink, fontFamily: "'Inter', sans-serif" }}>{t(lang, "languageLabel")}</p>
          <p className="text-[12px] mt-0.5" style={{ color: chrome.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>{t(lang, "languageHint")}</p>
          <div className="flex gap-2 mt-2">
            {LANGUAGES.map((opt) => {
              const active = languagePref === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onLanguageChange(opt.value)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                  style={{
                    backgroundColor: active ? chrome.success : "transparent",
                    color: active ? "#fff" : chrome.ink,
                    border: `1px solid ${active ? chrome.success : chrome.divider}`,
                  }}
                >
                  {opt.label || t(lang, opt.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
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
  const [languagePref, setLanguagePref] = useState(() => loadLanguagePref());
  const [tab, setTab] = useState("front");
  const [activeSection, setActiveSection] = useState(FRONT_PAGE_ID);
  const [article, setArticle] = useState(false);

  const refreshSource = useCallback(async (feed) => {
    setSources((prev) => ({ ...prev, [feed.id]: { ...(prev[feed.id] || {}), id: feed.id, status: "loading" } }));
    try {
      const data = await loadFeedData(feed.url);
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

  useEffect(() => {
    feedList.forEach((f) => refreshSource(f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAllFeeds = useCallback(() => {
    feedList.forEach((f) => refreshSource(f));
  }, [feedList, refreshSource]);

  const addFeed = useCallback(async (url) => {
    const id = crypto.randomUUID();
    let feedUrl = url;
    // Se l'url è già un feed valido, teniamo il risultato invece di scartarlo:
    // rifare subito lo stesso identico fetch solo per "validare" raddoppiava
    // inutilmente il tempo di attesa nel caso più comune.
    let data = null;
    try {
      data = await loadFeedData(url);
    } catch {
      // non è un feed diretto: prova a scoprirlo dall'<head> della pagina
      // (autodiscovery standard, es. <link rel="alternate" type="application/rss+xml">)
      try {
        const discovered = await discoverFeedUrl(url);
        if (discovered) feedUrl = discovered;
      } catch {
        // nessuna autodiscovery riuscita: si tenta comunque con l'url originale,
        // refreshSource mostrerà un errore chiaro se non è un feed valido
      }
    }
    const newFeed = { id, url: feedUrl, enabled: true, weight: 1 };
    setFeedList((prev) => {
      const next = [...prev, newFeed];
      saveFeedList(next);
      return next;
    });
    if (data) {
      saveSourceCache(id, data);
      setSources((prev) => ({ ...prev, [id]: { id, status: "ready", ...data } }));
    } else {
      await refreshSource(newFeed);
    }
  }, [refreshSource]);

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

  const toggleFeed = useCallback((id) => {
    setFeedList((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f));
      saveFeedList(next);
      return next;
    });
  }, []);

  const changeWeight = useCallback((id) => {
    setFeedList((prev) => {
      const next = prev.map((f) => {
        if (f.id !== id) return f;
        const idx = WEIGHT_LEVELS.findIndex((w) => w.value === (f.weight ?? 1));
        const nextLevel = WEIGHT_LEVELS[(idx + 1) % WEIGHT_LEVELS.length];
        return { ...f, weight: nextLevel.value };
      });
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

  const changeLanguage = useCallback((value) => {
    setLanguagePref(value);
    saveLanguagePref(value);
  }, []);

  const chrome = darkMode ? CHROME_DARK : CHROME_LIGHT;
  const lang = useMemo(() => resolveLanguage(languagePref), [languagePref]);

  const anyReady = Object.values(sources).some((s) => s && (s.status === "ready" || s.status === "stale"));
  const isRefreshing = Object.values(sources).some((s) => s && s.status === "loading");

  const allArticles = useMemo(() => {
    const list = [];
    for (const feed of feedList) {
      if (!feed.enabled) continue;
      const entry = sources[feed.id];
      if (!entry || (entry.status !== "ready" && entry.status !== "stale")) continue;
      const sourceName = entry.feedMeta?.title || feed.url;
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

  const currentView = useMemo(() => {
    const isFront = activeSection === FRONT_PAGE_ID;
    const articles = isFront ? allArticles : allArticles.filter((a) => a.section === activeSection);
    const composed = composeArticles(articles, sourceWeights, { diversify: isFront });
    const sectionMeta = buildSectionMeta(activeSection);
    const template = resolveTemplate(TEMPLATES[sectionMeta.templateId] || TEMPLATES[DEFAULT_TEMPLATE_ID], darkMode);
    return {
      id: sectionMeta.id,
      label: t(lang, sectionMeta.labelKey),
      accent: template.accent,
      paper: template.paper,
      ink: template.ink,
      mastheadStyle: template.mastheadStyle,
      headlineStyle: template.headlineStyle,
      hero: composed.hero ? mapArticle(composed.hero, [900, 650], lang) : null,
      secondary: composed.secondary.map((a) => mapArticle(a, [500, 400], lang)),
      brief: composed.brief.map((a) => ({ title: a.title, tag: a.sourceName || "", link: a.link })),
      stale: composed.stale,
    };
  }, [activeSection, allArticles, sourceWeights, darkMode, lang]);

  const paperColor = anyReady ? currentView.paper : chrome.screenBg;

  return (
    <div
      className={IS_NATIVE ? "h-screen flex flex-col overflow-hidden" : "min-h-screen flex items-center justify-center py-8"}
      style={{ backgroundColor: IS_NATIVE ? paperColor : chrome.pageBg, fontFamily: "'Inter', sans-serif" }}
    >
      <style>{FONTS}</style>
      <div
        className={IS_NATIVE ? "flex-1 min-h-0 flex flex-col overflow-hidden" : "w-[375px] h-[780px] rounded-[36px] overflow-hidden shadow-2xl flex flex-col"}
        style={IS_NATIVE ? { backgroundColor: paperColor } : { backgroundColor: paperColor, border: `8px solid ${chrome.bezel}` }}
      >
        {!IS_NATIVE && <StatusBar ink={anyReady ? currentView.ink : chrome.ink} />}

        {tab === "front" && !anyReady && (
          <div className="flex-1 flex items-center justify-center px-8 text-center">
            <p className="text-[13px]" style={{ color: chrome.ink, opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
              {feedList.length === 0 ? t(lang, "emptyNoFeeds") : t(lang, "loadingPaper")}
            </p>
          </div>
        )}

        {tab === "front" && anyReady && !article && (
          <>
            <Masthead view={currentView} lang={lang} onRefresh={refreshAllFeeds} refreshing={isRefreshing} />
            <div className="px-5 flex gap-2 pb-3 overflow-x-auto">
              {sectionTabs.map((st) => (
                <button
                  key={st.id}
                  onClick={() => { setActiveSection(st.id); setArticle(false); }}
                  className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-wide transition-colors shrink-0"
                  style={{
                    backgroundColor: activeSection === st.id ? st.accent : "transparent",
                    color: activeSection === st.id ? "#fff" : currentView.ink,
                    opacity: activeSection === st.id ? 1 : 0.5,
                    border: `1px solid ${activeSection === st.id ? st.accent : `${currentView.ink}33`}`,
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <FrontPage view={currentView} lang={lang} onOpenArticle={() => setArticle(true)} />
            </div>
          </>
        )}

        {tab === "front" && anyReady && article && (
          <div className="flex-1 overflow-y-auto">
            <ArticleView view={currentView} lang={lang} onBack={() => setArticle(false)} />
          </div>
        )}

        {tab === "feeds" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: chrome.screenBg }}>
            <FeedsScreen feedList={feedList} sources={sources} onToggle={toggleFeed} onRemove={removeFeed} onAdd={addFeed} onWeightChange={changeWeight} chrome={chrome} lang={lang} />
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
              languagePref={languagePref}
              onLanguageChange={changeLanguage}
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
