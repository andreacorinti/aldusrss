import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { ArticleImage } from "./ArticleImage";
import { Kicker } from "./Kicker";
import { stripHtml } from "../lib/format";
import { t } from "../lib/i18n";

export function ArticleView({ view, lang, onBack }) {
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
