import { isFresh } from "./classify";

// composeArticles ricalcola l'intera classifica da zero ogni volta che viene
// chiamato (vedi classify.js) — corretto per la qualità del ranking, ma
// spiazzante in UI: mano a mano che le fonti finiscono di caricare, un
// articolo già mostrato in cima, magari che l'utente ha appena cominciato a
// leggere, può spostarsi o sparire un attimo dopo solo perché un'altra fonte
// più "pesante" ha finito di rispondere (segnalato dal tester Tony: "la
// notizia sparisce perché nel frattempo ha caricato altro"). Le tre funzioni
// qui sotto tengono ferma la posizione di ciò che è già stato mostrato per
// un dato "scaffale" (hero / secondaria / in breve): i nuovi arrivi si
// accodano in fondo al proprio scaffale, mai il contrario. Scoped per
// scaffale (non per posizione assoluta nell'elenco) apposta: la secondaria
// richiede un'immagine, l'hero no — rimescolare per posizione piatta
// rischiava di spostare un pezzo senza immagine dentro uno slot pensato per
// averne una.
function stabilizeList(prevIds, freshList, cap) {
  const freshById = new Map(freshList.map((a) => [a.id, a]));
  const kept = prevIds.filter((id) => freshById.has(id));
  const keptSet = new Set(kept);
  const added = freshList.filter((a) => !keptSet.has(a.id)).map((a) => a.id);
  const ids = [...kept, ...added].slice(0, cap);
  return { ids, byId: freshById };
}

function stabilizeHero(prevHeroId, fresh) {
  if (prevHeroId) {
    const pool = [fresh.hero, ...fresh.secondary, ...fresh.brief].filter(Boolean);
    const found = pool.find((a) => a.id === prevHeroId);
    if (found) return found;
  }
  return fresh.hero;
}

// `state` è una Map mutabile (un ref lato chiamante) con una entry per
// "vista" (Prima Pagina, ciascuna sezione tematica): ognuna ha la propria
// composizione da stabilizzare indipendentemente.
export function stabilizeComposed(state, viewKey, fresh) {
  const prev = state.get(viewKey) || { heroId: null, secondaryIds: [], briefIds: [] };

  const hero = stabilizeHero(prev.heroId, fresh);
  const heroId = hero?.id ?? null;

  // Un hero "tenuto fermo" (vedi stabilizeHero) può comparire nell'ultimo
  // fresh.secondary/brief calcolato da composeArticles, che non sa nulla
  // della stabilizzazione e lo tratta come un pezzo qualunque del pool:
  // senza escluderlo qui, lo stesso articolo finirebbe mostrato due volte,
  // come hero e di nuovo come riga in uno degli altri scaffali.
  const secondary = stabilizeList(
    prev.secondaryIds.filter((id) => id !== heroId),
    fresh.secondary.filter((a) => a.id !== heroId),
    3
  );
  const brief = stabilizeList(
    prev.briefIds.filter((id) => id !== heroId),
    fresh.brief.filter((a) => a.id !== heroId),
    6
  );

  state.set(viewKey, { heroId: hero?.id ?? null, secondaryIds: secondary.ids, briefIds: brief.ids });

  return {
    hero,
    secondary: secondary.ids.map((id) => secondary.byId.get(id)),
    brief: brief.ids.map((id) => brief.byId.get(id)),
    stale: hero ? !isFresh(hero) : fresh.stale,
  };
}
