import { describe, it, expect } from "vitest";
import { assignSection, scoreArticle, isFresh, composeArticles } from "./classify";
import { DEFAULT_SECTION_ID } from "./sections";

describe("assignSection", () => {
  it("falls back to the default section when nothing matches", () => {
    expect(assignSection({ title: "Qualcosa di neutro", categories: [] })).toBe(DEFAULT_SECTION_ID);
  });

  it("trusts a native category over guessing from the title", () => {
    expect(assignSection({ title: "Un pezzo qualsiasi", categories: ["Calcio"] })).toBe("sport");
  });

  it("falls back to the title only when there are no categories at all", () => {
    expect(assignSection({ title: "L'ultimo smartphone Android è arrivato", categories: [] })).toBe("tecnologia");
  });

  it("ignores the title once real categories are present, even if unrelated to them", () => {
    // Categorie presenti (anche se non matchano nulla) disattivano il
    // fallback sul titolo: un feed che tagga con categorie proprie non deve
    // vedersi scavalcato da un titolo che menziona altro per caso.
    expect(assignSection({ title: "Le migliori ricette con il basket... di frutta", categories: ["Cucina"] })).toBe(
      DEFAULT_SECTION_ID
    );
  });

  it("matches keywords on word boundaries only (partecipanti must not match arte)", () => {
    expect(assignSection({ title: "I partecipanti al concorso sono aumentati", categories: [] })).toBe(
      DEFAULT_SECTION_ID
    );
  });

  it("uses sectionHint only as a last resort, never overriding a real keyword match", () => {
    expect(assignSection({ title: "Niente di riconoscibile qui", categories: [] }, "sport")).toBe("sport");
    expect(assignSection({ title: "Grande vittoria nel calcio", categories: [] }, "tecnologia")).toBe("sport");
  });
});

describe("scoreArticle", () => {
  it("decays to half after one half-life (8h)", () => {
    const pubDate = new Date(Date.now() - 8 * 3600000).toUTCString();
    const score = scoreArticle({ pubDate }, 1, { frontPage: false });
    expect(score).toBeCloseTo(0.5, 2);
  });

  it("scales linearly with source weight", () => {
    const pubDate = new Date().toUTCString();
    const base = scoreArticle({ pubDate }, 1);
    const weighted = scoreArticle({ pubDate }, 2);
    expect(weighted).toBeCloseTo(base * 2, 5);
  });

  it("discounts sport in the front-page ranking but not in its own section", () => {
    const pubDate = new Date().toUTCString();
    const frontPageScore = scoreArticle({ pubDate, section: "sport" }, 1, { frontPage: true });
    const sectionScore = scoreArticle({ pubDate, section: "sport" }, 1, { frontPage: false });
    expect(frontPageScore).toBeLessThan(sectionScore);
  });

  it("treats an unparseable date as very old rather than crashing", () => {
    const score = scoreArticle({ pubDate: "not a date" }, 1);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.001);
  });
});

describe("isFresh", () => {
  it("is true within the 5-day window", () => {
    expect(isFresh({ pubDate: new Date().toUTCString() })).toBe(true);
  });

  it("is false past the 5-day window", () => {
    expect(isFresh({ pubDate: new Date(Date.now() - 6 * 24 * 3600000).toUTCString() })).toBe(false);
  });

  it("is false when the date can't be parsed", () => {
    expect(isFresh({ pubDate: "garbage" })).toBe(false);
  });
});

describe("composeArticles", () => {
  function article(id, { sourceId = "src", section = "attualita", image = true, minutesAgo = 0 } = {}) {
    return {
      id,
      sourceId,
      section,
      image: image ? `https://example.com/${id}.jpg` : null,
      pubDate: new Date(Date.now() - minutesAgo * 60000).toUTCString(),
      title: id,
    };
  }

  it("picks the highest-scoring article as hero", () => {
    const articles = [article("old", { minutesAgo: 500 }), article("new", { minutesAgo: 1 })];
    const { hero } = composeArticles(articles, {}, { diversify: false });
    expect(hero.id).toBe("new");
  });

  it("never lets a single source place more than 2 items when diversifying (front page)", () => {
    const articles = [
      article("a1", { sourceId: "prolific", minutesAgo: 1 }),
      article("a2", { sourceId: "prolific", minutesAgo: 2 }),
      article("a3", { sourceId: "prolific", minutesAgo: 3 }),
      article("a4", { sourceId: "prolific", minutesAgo: 4 }),
      article("b1", { sourceId: "other", minutesAgo: 5 }),
    ];
    const { hero, secondary, brief } = composeArticles(articles, {}, { diversify: true });
    const fromProlific = [hero, ...secondary, ...brief].filter((a) => a.sourceId === "prolific").length;
    expect(fromProlific).toBeLessThanOrEqual(2);
  });

  it("flags stale when the chosen hero falls outside the freshness window", () => {
    const articles = [article("lonely", { minutesAgo: 10 * 24 * 60 })];
    const { stale } = composeArticles(articles, {}, { diversify: false });
    expect(stale).toBe(true);
  });

  it("returns an empty bucket for no articles", () => {
    expect(composeArticles([], {}, {})).toEqual({ hero: null, secondary: [], brief: [], stale: false });
  });
});
