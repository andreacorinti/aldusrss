import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { t } from "../lib/i18n";

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
export function PullToRefresh({ onRefresh, refreshing, chrome, accent, lang, onSwipeNext, onSwipePrev, hasNext, hasPrev, children }) {
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
