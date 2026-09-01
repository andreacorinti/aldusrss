import { useState, useEffect, useCallback, useRef } from "react";

// Riga di pill orizzontale scrollabile: su schermi stretti (Android reale) le
// ultime sezioni restano fuori dai bordi senza alcun indizio visivo che ce ne
// sono altre da scorrere (segnalato dall'utente: sembra che la lista sia
// "tagliata"/incompleta). Due sfumature ai bordi, mostrate solo quando c'è
// davvero altro contenuto in quella direzione, comunicano lo scroll possibile.
export function SectionTabs({ sectionTabs, activeSection, onSelect, view, paperColor }) {
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
