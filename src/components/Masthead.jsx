// Il nome della testata resta sempre nello stesso font, a differenza dei
// titoli degli articoli (che cambiano stile per sezione, identità
// editoriale voluta): è il logo dell'app, deve restare riconoscibile
// uguale su ogni schermata invece di saltare tra 4 stili diversi cambiando
// sezione.
const MASTHEAD_STYLE = { fontFamily: "'Fraunces', serif", fontWeight: 900, letterSpacing: "0.02em", textTransform: "uppercase" };

export function Masthead({ view, lang }) {
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
