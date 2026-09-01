import { AlertTriangle, Clock } from "lucide-react";
import { ArticleImage } from "./ArticleImage";
import { Kicker } from "./Kicker";
import { t } from "../lib/i18n";

export function FrontPage({ view, lang, onOpenArticle }) {
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
