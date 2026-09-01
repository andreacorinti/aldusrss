import { useState } from "react";
import { Loader2, ExternalLink, Moon, Mail, Trash2 } from "lucide-react";
import { version as APP_VERSION } from "../../package.json";
import { ReorderableSectionsList } from "./ReorderableSectionsList";
import { t } from "../lib/i18n";

export function SettingsScreen({ hiddenSections, onToggleSection, sectionOrder, onReorderSections, darkMode, onToggleDarkMode, onClearCache, chrome, lang }) {
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
