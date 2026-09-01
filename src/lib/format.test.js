import { describe, it, expect } from "vitest";
import { stripHtml, parseDate, relativeTime, hashAccentColor } from "./format";

describe("stripHtml", () => {
  it("returns empty string for falsy input", () => {
    expect(stripHtml("")).toBe("");
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
  });

  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Ciao</p>\n<p>mondo</p>")).toBe("Ciao mondo");
  });

  it("returns literal text even when it looks like markup (Il Sole 24 Ore dc:creator case)", () => {
    // .textContent already strips the tags at the XML-parsing layer for
    // literal text like `di <a href="...">R.I.T.</a>` — stripHtml is the
    // second line of defense for genuine HTML fragments.
    expect(stripHtml('di <a href="https://example.com">R.I.T.</a>')).toBe("di R.I.T.");
  });
});

describe("parseDate", () => {
  it("returns NaN for empty input", () => {
    expect(Number.isNaN(parseDate(""))).toBe(true);
    expect(Number.isNaN(parseDate(null))).toBe(true);
  });

  it("parses standard RFC 2822 dates natively", () => {
    const t = parseDate("Tue, 01 Sep 2026 08:59:15 +0200");
    expect(Number.isNaN(t)).toBe(false);
    expect(new Date(t).toISOString()).toBe("2026-09-01T06:59:15.000Z");
  });

  it("falls back to translating an Italian abbreviated month (Sky Sport style)", () => {
    const t = parseDate("gio, 27 ago 2026 10:10:00 GMT");
    expect(Number.isNaN(t)).toBe(false);
    expect(new Date(t).toISOString()).toBe("2026-08-27T10:10:00.000Z");
  });

  it("returns NaN when the Italian month abbreviation is unrecognized", () => {
    expect(Number.isNaN(parseDate("gio, 27 xyz 2026 10:10:00 GMT"))).toBe(true);
  });

  it("returns NaN for garbage input", () => {
    expect(Number.isNaN(parseDate("not a date at all"))).toBe(true);
  });
});

describe("relativeTime", () => {
  it("returns empty string when the date can't be parsed", () => {
    expect(relativeTime("not a date")).toBe("");
  });

  it("reports minutes for recent dates, in the requested language", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toUTCString();
    expect(relativeTime(fiveMinAgo, "it")).toBe("5 min fa");
    expect(relativeTime(fiveMinAgo, "en")).toBe("5 min ago");
  });

  it("reports hours with correct Italian singular/plural", () => {
    const oneHourAgo = new Date(Date.now() - 61 * 60000).toUTCString();
    expect(relativeTime(oneHourAgo, "it")).toBe("1 ora fa");
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toUTCString();
    expect(relativeTime(threeHoursAgo, "it")).toBe("3 ore fa");
  });
});

describe("hashAccentColor", () => {
  it("is deterministic for the same seed", () => {
    expect(hashAccentColor("ansa")).toBe(hashAccentColor("ansa"));
  });

  it("produces a valid hsl() string", () => {
    expect(hashAccentColor("some-source-id")).toMatch(/^hsl\(\d+, 45%, 34%\)$/);
  });
});
