import { describe, it, expect } from "vitest";
import { stabilizeComposed } from "./stabilizeComposed";

const now = new Date().toISOString();
const art = (id) => ({ id, pubDate: now });

describe("stabilizeComposed", () => {
  it("keeps the first hero/secondary/brief order once shown", () => {
    const state = new Map();
    const A = art("A"), B = art("B"), C = art("C"), D = art("D");
    const first = stabilizeComposed(state, "front", { hero: A, secondary: [B, C], brief: [D], stale: false });
    expect(first.hero.id).toBe("A");
    expect(first.secondary.map((a) => a.id)).toEqual(["B", "C"]);
    expect(first.brief.map((a) => a.id)).toEqual(["D"]);
  });

  it("appends genuinely new arrivals below existing ones instead of reshuffling (Tony's report)", () => {
    const state = new Map();
    const A = art("A"), B = art("B"), C = art("C"), D = art("D");
    stabilizeComposed(state, "front", { hero: A, secondary: [B, C], brief: [D], stale: false });

    // Una nuova fonte finisce di caricare: E ha un punteggio più alto di
    // tutti, ma A/B/C/D restano ancora nel pool (spostati in basso dal
    // ricalcolo di composeArticles) — non devono muoversi di posizione.
    const E = art("E"), F = art("F"), G = art("G");
    const second = stabilizeComposed(state, "front", {
      hero: E, // composeArticles esclude sempre l'hero dal resto del pool
      secondary: [B, C, F],
      brief: [A, D, G],
      stale: false,
    });

    expect(second.hero.id).toBe("A"); // A è ancora nel pool (in "brief" ora) → resta hero
    expect(second.secondary.map((a) => a.id)).toEqual(["B", "C", "F"]); // F si accoda, cap 3
    // A resta hero: composeArticles non lo sa e lo rimette anche in "brief",
    // ma non deve comparire due volte a schermo.
    expect(second.brief.map((a) => a.id)).toEqual(["D", "G"]);
  });

  it("only replaces the hero once it truly disappears from the whole pool", () => {
    const state = new Map();
    const A = art("A"), B = art("B");
    stabilizeComposed(state, "front", { hero: A, secondary: [B], brief: [], stale: false });

    const E = art("E");
    const result = stabilizeComposed(state, "front", { hero: E, secondary: [B], brief: [], stale: false });
    expect(result.hero.id).toBe("E");
  });

  it("keeps each view (front page vs a section) independently stable", () => {
    const state = new Map();
    const A = art("A"), S = art("S");
    stabilizeComposed(state, "front", { hero: A, secondary: [], brief: [], stale: false });
    stabilizeComposed(state, "sport", { hero: S, secondary: [], brief: [], stale: false });

    const A2 = art("A2");
    const frontAgain = stabilizeComposed(state, "front", { hero: A2, secondary: [], brief: [], stale: false });
    const sportAgain = stabilizeComposed(state, "sport", { hero: S, secondary: [], brief: [], stale: false });
    expect(frontAgain.hero.id).toBe("A2"); // A è sparito dal pool di "front" → sostituito
    expect(sportAgain.hero.id).toBe("S"); // "sport" non è stato toccato, resta S
  });
});
