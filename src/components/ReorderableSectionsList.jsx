import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { t } from "../lib/i18n";

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
export function ReorderableSectionsList({ sectionOrder, hiddenSections, onToggleSection, onReorderSections, chrome, lang }) {
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
