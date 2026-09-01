import { useState, useMemo, useRef } from "react";
import { Rss, Plus, X, Loader2, AlertTriangle, ExternalLink, ChevronUp, ChevronDown, Upload } from "lucide-react";
import { CURATED_PACKS } from "../lib/curatedFeeds";
import { searchPublishers } from "../lib/publisherSearch";
import { isFresh } from "../lib/classify";
import { normalizeUrl } from "../lib/url";
import { t } from "../lib/i18n";

const WEIGHT_LEVELS = [
  { value: 0.5, labelKey: "weightLow" },
  { value: 1, labelKey: "weightNormal" },
  { value: 1.5, labelKey: "weightHigh" },
];

export function FeedsScreen({ feedList, sources, onToggle, onRemove, onAdd, onAddPack, onRemovePack, onImportOpml, onWeightChange, chrome, lang }) {
  const [adding, setAdding] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [addError, setAddError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [addingPackId, setAddingPackId] = useState(null);
  const [importingOpml, setImportingOpml] = useState(false);
  const [opmlError, setOpmlError] = useState("");
  const [opmlResult, setOpmlResult] = useState(null);
  const opmlInputRef = useRef(null);

  async function handleOpmlFile(e) {
    const file = e.target.files?.[0];
    // Azzerato subito, non solo dopo l'esito: senza, riselezionare lo stesso
    // file una seconda volta (es. per riprovare dopo un errore) non faceva
    // scattare affatto onChange, perché il valore dell'input non era
    // cambiato.
    e.target.value = "";
    if (!file) return;
    setOpmlError("");
    setOpmlResult(null);
    setImportingOpml(true);
    try {
      const text = await file.text();
      const result = await onImportOpml(text);
      setOpmlResult(result);
    } catch {
      setOpmlError(t(lang, "errorOpmlInvalid"));
    } finally {
      setImportingOpml(false);
    }
  }

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

        <div className="mt-1">
          <input
            ref={opmlInputRef}
            type="file"
            accept=".opml,.xml,text/xml,text/x-opml"
            className="hidden"
            onChange={handleOpmlFile}
          />
          <button
            onClick={() => opmlInputRef.current?.click()}
            disabled={importingOpml}
            className="w-full py-2.5 rounded-lg text-[12.5px] font-medium flex items-center justify-center gap-1.5"
            style={{ color: chrome.ink, opacity: importingOpml ? 0.5 : 0.75, fontFamily: "'Inter', sans-serif" }}
          >
            {importingOpml ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {t(lang, "importOpmlButton")}
          </button>
          {opmlError && (
            <p className="mt-1 text-[11.5px] text-center" style={{ color: chrome.danger }}>{opmlError}</p>
          )}
          {opmlResult && !opmlError && (
            <p className="mt-1 text-[11.5px] text-center" style={{ color: chrome.success }}>
              {opmlResult.added === 0
                ? t(lang, "importOpmlNoneNew")
                : opmlResult.added === 1
                  ? t(lang, "importOpmlDoneOne")
                  : t(lang, "importOpmlDoneMany").replace("{n}", opmlResult.added)}
            </p>
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
