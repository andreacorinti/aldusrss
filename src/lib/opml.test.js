import { describe, it, expect } from "vitest";
import { parseOpml } from "./opml";

describe("parseOpml", () => {
  it("extracts feeds nested under category folders, at any depth", () => {
    const xml = `<?xml version="1.0"?>
      <opml version="2.0">
        <head><title>My subscriptions</title></head>
        <body>
          <outline text="News">
            <outline type="rss" text="BBC News" title="BBC News" xmlUrl="https://feeds.bbci.co.uk/news/rss.xml" htmlUrl="https://bbc.com"/>
          </outline>
          <outline type="rss" text="Flat one" xmlUrl="https://example.com/feed"/>
        </body>
      </opml>`;
    const entries = parseOpml(xml);
    expect(entries).toEqual([
      { url: "https://feeds.bbci.co.uk/news/rss.xml", label: "BBC News" },
      { url: "https://example.com/feed", label: "Flat one" },
    ]);
  });

  it("falls back to the text attribute when title is missing", () => {
    const xml = `<opml><body><outline text="Only text" xmlUrl="https://example.com/feed"/></body></opml>`;
    expect(parseOpml(xml)).toEqual([{ url: "https://example.com/feed", label: "Only text" }]);
  });

  it("omits label entirely when neither title nor text is present", () => {
    const xml = `<opml><body><outline xmlUrl="https://example.com/feed"/></body></opml>`;
    expect(parseOpml(xml)).toEqual([{ url: "https://example.com/feed" }]);
  });

  it("de-duplicates repeated xmlUrl entries, keeping the first", () => {
    const xml = `<opml><body>
      <outline text="A" xmlUrl="https://example.com/feed"/>
      <outline text="B" xmlUrl="https://example.com/feed"/>
    </body></opml>`;
    expect(parseOpml(xml)).toEqual([{ url: "https://example.com/feed", label: "A" }]);
  });

  it("ignores outline entries without xmlUrl (plain folders, HTML-only bookmarks)", () => {
    const xml = `<opml><body>
      <outline text="Just a folder"/>
      <outline text="Bookmark" htmlUrl="https://example.com"/>
    </body></opml>`;
    expect(parseOpml(xml)).toEqual([]);
  });

  it("returns an empty list for a body with no outlines", () => {
    expect(parseOpml("<opml><body></body></opml>")).toEqual([]);
  });

  it("throws on malformed XML", () => {
    expect(() => parseOpml("<opml><body>")).toThrow();
  });

  it("throws when there's no <body> at all", () => {
    expect(() => parseOpml("<opml><head><title>x</title></head></opml>")).toThrow();
  });
});
