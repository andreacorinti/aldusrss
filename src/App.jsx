import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Menu, Rss, Newspaper, Settings2, ArrowLeft, Clock, Plus, X, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { fetchFeedXML, parseFeed } from "./lib/rss";
import { assignSection, composeArticles } from "./lib/classify";
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from "./lib/templates";
import { SECTIONS, SECTION_ORDER, DEFAULT_SECTION_ID, FRONT_PAGE_ID } from "./lib/sections";
import { stripHtml, relativeTime, placeholderImage } from "./lib/format";
import {
  loadFeedList,
  saveFeedList,
  loadCache,
  saveSourceCache,
  removeSourceCache,
  loadHiddenSections,
  saveHiddenSections,
} from "./lib/storage";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,900;1,9..144,500;1,9..144,700&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap');
`;

const WEIGHT_LEVELS = [
  { value: 0.5, label: "Basso" },
  { value: 1, label: "Normale" },
  { value: 1.5, label: "Alto" },
];

function weightLabel(value) {
  return WEIGHT_LEVELS.find((w) => w.value === value)?.label || "Normale";
}

function mapArticle(a, size) {
  return {
    ...a,
    image: a.image || placeholderImage(a.id, size[0], size[1]),
    kicker: (a.sourceName || "Notizia").toUpperCase(),
    dek: stripHtml(a.description).slice(0, 180),
    time: relativeTime(a.pubDate),
  };
}

function buildSectionMeta(id) {
  if (id === FRONT_PAGE_ID) return { id: FRONT_PAGE_ID, label: "Prima Pagina", templateId: DEFAULT_TEMPLATE_ID };
  return SECTIONS[id] || { id, label: id, templateId: DEFAULT_TEMPLATE_ID };
}

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

function Masthead({ view, onMenu }) {
  const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="px-5 pt-2 pb-3">
      <div className="flex items-center justify-between">
        <button onClick={onMenu} className="p-1 -ml-1">
          <Menu size={20} style={{ color: view.ink }} />
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

function FrontPage({ view, onOpenArticle }) {
  if (!view.hero) {
    return (
      <div className="px-5 pb-6 pt-8 text-center">
        <p className="text-[13px]" style={{ color: view.ink, opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
          Nessun articolo disponibile in questa sezione al momento.
        </p>
      </div>
    );
  }
  return (
    <div className="px-5 pb-6">
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

function ArticleView({ view, onBack }) {
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
          Leggi l'articolo originale <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

function FeedsScreen({ feedList, sources, onToggle, onRemove, onAdd, onWeightChange }) {
  const [adding, setAdding] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [addError, setAddError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      setAddError("URL non valido");
      return;
    }
    if (feedList.some((f) => f.url === url)) {
      setAddError("Questo feed è già nella lista");
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
      <h2 className="text-[20px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: "#211D19" }}>I tuoi feed</h2>
      <p className="text-[12.5px] mt-1 mb-4" style={{ color: "#211D19", opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
        Ogni fonte alimenta le sezioni del tuo giornale. Il peso decide quanto conta in "Prima Pagina".
      </p>
      <div className="space-y-2.5">
        {feedList.map((f) => {
          const s = sources[f.id];
          const label = s?.feedMeta?.title || f.url;
          return (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-lg gap-2" style={{ backgroundColor: "#FFFFFFAA", border: "1px solid #21201C1A" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-md flex items-center justify-center text-[13px] font-bold" style={{ backgroundColor: "#21201C14", color: "#211D19", fontFamily: "'Fraunces', serif" }}>
                  {label[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate" style={{ color: "#211D19", fontFamily: "'Inter', sans-serif" }}>{label}</p>
                  {s?.status === "loading" && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "#211D1988" }}>
                      <Loader2 size={11} className="animate-spin" /> caricamento…
                    </span>
                  )}
                  {s?.status === "error" && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "#A31E22" }}>
                      <AlertTriangle size={11} /> {s.errorMessage || "errore di caricamento"}
                    </span>
                  )}
                  {s?.status === "stale" && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "#C97A2B" }}>
                      <AlertTriangle size={11} /> non raggiungibile, mostro l'ultima copia
                    </span>
                  )}
                  {s?.status === "ready" && (
                    <p className="text-[11.5px] truncate" style={{ color: "#211D19", opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>{f.url}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onWeightChange(f.id)}
                  title={`Peso: ${weightLabel(f.weight)} (tocca per cambiare)`}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: "#21201C14", color: "#211D19" }}
                >
                  {weightLabel(f.weight)[0]}
                </button>
                <button
                  onClick={() => onToggle(f.id)}
                  className="w-9 h-5 rounded-full relative transition-colors"
                  style={{ backgroundColor: f.enabled ? "#2E6F6A" : "#21201C33" }}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.enabled ? "18px" : "2px" }} />
                </button>
                <button onClick={() => onRemove(f.id)} className="p-1.5" aria-label="Rimuovi feed">
                  <X size={15} color="#211D1988" />
                </button>
              </div>
            </div>
          );
        })}

        {adding ? (
          <form onSubmit={handleSubmit} className="p-3 rounded-lg border border-dashed" style={{ borderColor: "#21201C33" }}>
            <input
              autoFocus
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://esempio.it/feed.xml"
              className="w-full text-[13px] px-2.5 py-2 rounded-md outline-none"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #21201C33", fontFamily: "'Inter', sans-serif" }}
            />
            {addError && <p className="mt-1.5 text-[11.5px]" style={{ color: "#A31E22" }}>{addError}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 rounded-md text-[12.5px] font-medium text-white flex items-center justify-center gap-1.5"
                style={{ backgroundColor: "#211D19", opacity: submitting ? 0.6 : 1 }}
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                Aggiungi
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setAddError(""); setUrlInput(""); }}
                className="px-3 py-2 rounded-md text-[12.5px] font-medium"
                style={{ color: "#211D19AA", border: "1px solid #21201C33" }}
              >
                Annulla
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full mt-1 py-3 rounded-lg text-[13px] font-medium border border-dashed flex items-center justify-center gap-1.5"
            style={{ color: "#211D19AA", borderColor: "#21201C33", fontFamily: "'Inter', sans-serif" }}
          >
            <Plus size={14} /> Aggiungi un feed RSS
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsScreen({ hiddenSections, onToggleSection }) {
  return (
    <div className="px-5 pt-4 pb-8">
      <h2 className="text-[20px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: "#211D19" }}>Impostazioni</h2>
      <div className="mt-4 p-4 rounded-lg space-y-3" style={{ backgroundColor: "#FFFFFFAA", border: "1px solid #21201C1A" }}>
        <div>
          <p className="text-[14px] font-medium" style={{ color: "#211D19", fontFamily: "'Inter', sans-serif" }}>Sezioni visibili</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#211D19", opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>Nascondi le sezioni che non ti interessano</p>
        </div>
        {SECTION_ORDER.map((id) => {
          const section = SECTIONS[id];
          const visible = !hiddenSections.includes(id);
          return (
            <div key={id} className="flex items-center justify-between text-[13px]" style={{ color: "#211D19", fontFamily: "'Inter', sans-serif" }}>
              {section.label}
              <button
                onClick={() => onToggleSection(id)}
                className="w-9 h-5 rounded-full relative shrink-0"
                style={{ backgroundColor: visible ? "#2E6F6A" : "#21201C33" }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: visible ? "18px" : "2px" }} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: "#FFFFFFAA", border: "1px solid #21201C1A" }}>
        <p className="text-[12.5px]" style={{ color: "#211D19", opacity: 0.7, fontFamily: "'Inter', sans-serif" }}>
          Nessun contatore di "non letti": il giornale si aggiorna da solo, aprilo quando vuoi tu.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [feedList, setFeedList] = useState(() => loadFeedList());
  const [sources, setSources] = useState({});
  const [hiddenSections, setHiddenSections] = useState(() => loadHiddenSections());
  const [tab, setTab] = useState("front");
  const [activeSection, setActiveSection] = useState(FRONT_PAGE_ID);
  const [article, setArticle] = useState(false);

  const refreshSource = useCallback(async (feed) => {
    setSources((prev) => ({ ...prev, [feed.id]: { ...(prev[feed.id] || {}), id: feed.id, status: "loading" } }));
    try {
      const xml = await fetchFeedXML(feed.url);
      const parsed = parseFeed(xml);
      const articles = parsed.articles.map((a) => ({ ...a, section: assignSection(a) }));
      const data = {
        feedMeta: { title: parsed.title, description: parsed.description, link: parsed.link },
        articles,
      };
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

  const addFeed = useCallback(async (url) => {
    const id = crypto.randomUUID();
    const newFeed = { id, url, enabled: true, weight: 1 };
    setFeedList((prev) => {
      const next = [...prev, newFeed];
      saveFeedList(next);
      return next;
    });
    await refreshSource(newFeed);
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

  const anyReady = Object.values(sources).some((s) => s && (s.status === "ready" || s.status === "stale"));

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
    return SECTION_ORDER.filter((id) => present.has(id) && !hiddenSections.includes(id));
  }, [allArticles, hiddenSections]);

  const sectionTabs = useMemo(() => {
    const tabs = [{ id: FRONT_PAGE_ID, label: "Prima Pagina", accent: TEMPLATES[DEFAULT_TEMPLATE_ID].accent }];
    for (const id of visibleSections) {
      const meta = SECTIONS[id];
      tabs.push({ id, label: meta.label, accent: TEMPLATES[meta.templateId]?.accent || TEMPLATES[DEFAULT_TEMPLATE_ID].accent });
    }
    return tabs;
  }, [visibleSections]);

  useEffect(() => {
    if (activeSection !== FRONT_PAGE_ID && !visibleSections.includes(activeSection)) {
      setActiveSection(FRONT_PAGE_ID);
      setArticle(false);
    }
  }, [visibleSections, activeSection]);

  const currentView = useMemo(() => {
    const isFront = activeSection === FRONT_PAGE_ID;
    const articles = isFront ? allArticles : allArticles.filter((a) => a.section === activeSection);
    const composed = composeArticles(articles, sourceWeights);
    const sectionMeta = buildSectionMeta(activeSection);
    const template = TEMPLATES[sectionMeta.templateId] || TEMPLATES[DEFAULT_TEMPLATE_ID];
    return {
      id: sectionMeta.id,
      label: sectionMeta.label,
      accent: template.accent,
      paper: template.paper,
      ink: template.ink,
      mastheadStyle: template.mastheadStyle,
      headlineStyle: template.headlineStyle,
      hero: composed.hero ? mapArticle(composed.hero, [900, 650]) : null,
      secondary: composed.secondary.map((a) => mapArticle(a, [500, 400])),
      brief: composed.brief.map((a) => ({ title: a.title, tag: a.sourceName || "", link: a.link })),
    };
  }, [activeSection, allArticles, sourceWeights]);

  return (
    <div className="min-h-screen flex items-center justify-center py-8" style={{ backgroundColor: "#DDD8CB", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS}</style>
      <div
        className="w-[375px] h-[780px] rounded-[36px] overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: anyReady ? currentView.paper : "#EFE9DC", border: "8px solid #16140F" }}
      >
        <StatusBar ink={anyReady ? currentView.ink : "#211D19"} />

        {tab === "front" && !anyReady && (
          <div className="flex-1 flex items-center justify-center px-8 text-center">
            <p className="text-[13px]" style={{ color: "#211D19", opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
              {feedList.length === 0
                ? "Nessun feed configurato. Aggiungine uno dalla scheda \"Feed\"."
                : "Caricamento del giornale in corso…"}
            </p>
          </div>
        )}

        {tab === "front" && anyReady && !article && (
          <>
            <Masthead view={currentView} onMenu={() => {}} />
            <div className="px-5 flex gap-2 pb-3 overflow-x-auto">
              {sectionTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveSection(t.id); setArticle(false); }}
                  className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-wide transition-colors shrink-0"
                  style={{
                    backgroundColor: activeSection === t.id ? t.accent : "transparent",
                    color: activeSection === t.id ? "#fff" : currentView.ink,
                    opacity: activeSection === t.id ? 1 : 0.5,
                    border: `1px solid ${activeSection === t.id ? t.accent : `${currentView.ink}33`}`,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <FrontPage view={currentView} onOpenArticle={() => setArticle(true)} />
            </div>
          </>
        )}

        {tab === "front" && anyReady && article && (
          <div className="flex-1 overflow-y-auto">
            <ArticleView view={currentView} onBack={() => setArticle(false)} />
          </div>
        )}

        {tab === "feeds" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#EDE8DC" }}>
            <FeedsScreen feedList={feedList} sources={sources} onToggle={toggleFeed} onRemove={removeFeed} onAdd={addFeed} onWeightChange={changeWeight} />
          </div>
        )}

        {tab === "settings" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#EDE8DC" }}>
            <SettingsScreen hiddenSections={hiddenSections} onToggleSection={toggleSectionHidden} />
          </div>
        )}

        {/* Bottom nav */}
        <div className="flex items-center justify-around py-3 border-t" style={{ borderColor: "#00000014", backgroundColor: "#FBF9F3" }}>
          {[
            { id: "front", label: "Prima pagina", icon: Newspaper },
            { id: "feeds", label: "Feed", icon: Rss },
            { id: "settings", label: "Impostazioni", icon: Settings2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setArticle(false);
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <Icon size={19} color={tab === id ? "#211D19" : "#211D1966"} />
              <span className="text-[9.5px]" style={{ color: tab === id ? "#211D19" : "#211D1966" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
