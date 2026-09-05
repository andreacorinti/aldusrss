import { describe, it, expect, vi, afterEach } from "vitest";
import { parseFeed, decodeWindows1252, isLatin1Family, discoverFeedUrl } from "./rss";

function rss(itemsXml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Test Feed</title>
    <description>A feed for testing</description>
    <link>https://example.com</link>
    ${itemsXml}
  </channel>
</rss>`;
}

describe("parseFeed / RSS", () => {
  it("parses channel and item basics", () => {
    const xml = rss(`
      <item>
        <title>Ciao mondo</title>
        <link>https://example.com/a</link>
        <guid>https://example.com/a</guid>
        <description>Testo dell'articolo</description>
        <pubDate>Tue, 01 Sep 2026 08:59:15 +0200</pubDate>
        <category>News</category>
      </item>
    `);
    const parsed = parseFeed(xml);
    expect(parsed.title).toBe("Test Feed");
    expect(parsed.articles).toHaveLength(1);
    const a = parsed.articles[0];
    expect(a.title).toBe("Ciao mondo");
    expect(a.link).toBe("https://example.com/a");
    expect(a.categories).toEqual(["News"]);
  });

  it("prefers content:encoded over description when both are present", () => {
    const xml = rss(`
      <item>
        <title>T</title>
        <link>https://example.com/a</link>
        <description>Riassunto breve</description>
        <content:encoded><![CDATA[<p>Testo completo</p>]]></content:encoded>
      </item>
    `);
    const parsed = parseFeed(xml);
    expect(parsed.articles[0].description).toContain("Testo completo");
  });

  it("falls back to guid, then to title+index, when no better id is available", () => {
    const xml = rss(`
      <item><title>Solo titolo</title><link>https://example.com/x</link></item>
    `);
    const parsed = parseFeed(xml);
    expect(parsed.articles[0].id).toBe("https://example.com/x");
  });

  it("strips literal HTML markup out of dc:creator (Il Sole 24 Ore case)", () => {
    const xml = rss(`
      <item>
        <title>T</title>
        <link>https://example.com/a</link>
        <dc:creator>di &lt;a href="https://example.com"&gt;R.I.T.&lt;/a&gt;</dc:creator>
      </item>
    `);
    const parsed = parseFeed(xml);
    expect(parsed.articles[0].author).toBe("di R.I.T.");
  });

  describe("extractImage", () => {
    it("uses an image enclosure when present", () => {
      const xml = rss(`
        <item>
          <title>T</title><link>https://example.com/a</link>
          <enclosure url="https://example.com/pic.jpg" type="image/jpeg" />
        </item>
      `);
      expect(parseFeed(xml).articles[0].image).toBe("https://example.com/pic.jpg");
    });

    it("ignores a non-image enclosure (e.g. a podcast audio file)", () => {
      const xml = rss(`
        <item>
          <title>T</title><link>https://example.com/a</link>
          <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
          <description><![CDATA[<img src="https://example.com/fallback.jpg" />]]></description>
        </item>
      `);
      expect(parseFeed(xml).articles[0].image).toBe("https://example.com/fallback.jpg");
    });

    it("reads media:content url (GameSurf-style feeds)", () => {
      const xml = rss(`
        <item>
          <title>T</title><link>https://example.com/a</link>
          <media:content url="https://example.com/media.jpg"/>
        </item>
      `);
      expect(parseFeed(xml).articles[0].image).toBe("https://example.com/media.jpg");
    });

    it("falls through to media:thumbnail when media:content has no url (Wired-style feeds)", () => {
      const xml = rss(`
        <item>
          <title>T</title><link>https://example.com/a</link>
          <media:content/>
          <media:thumbnail url="https://example.com/thumb.jpg"/>
        </item>
      `);
      expect(parseFeed(xml).articles[0].image).toBe("https://example.com/thumb.jpg");
    });

    it("falls back to the first <img> in the description when no enclosure/media tag exists", () => {
      const xml = rss(`
        <item>
          <title>T</title><link>https://example.com/a</link>
          <description><![CDATA[<img src="https://example.com/inline.jpg" width="100"/>]]></description>
        </item>
      `);
      expect(parseFeed(xml).articles[0].image).toBe("https://example.com/inline.jpg");
    });

    it("is null when no image can be found anywhere", () => {
      const xml = rss(`<item><title>T</title><link>https://example.com/a</link></item>`);
      expect(parseFeed(xml).articles[0].image).toBeNull();
    });
  });

  it("drops an image reused across multiple articles (Gazzetta-style generic cover)", () => {
    const xml = rss(`
      <item><title>A</title><link>https://example.com/a</link><enclosure url="https://example.com/generic.jpg" type="image/jpeg"/></item>
      <item><title>B</title><link>https://example.com/b</link><enclosure url="https://example.com/generic.jpg" type="image/jpeg"/></item>
      <item><title>C</title><link>https://example.com/c</link><enclosure url="https://example.com/unique.jpg" type="image/jpeg"/></item>
    `);
    const { articles } = parseFeed(xml);
    expect(articles[0].image).toBeNull();
    expect(articles[1].image).toBeNull();
    expect(articles[2].image).toBe("https://example.com/unique.jpg");
  });
});

describe("parseFeed / Atom", () => {
  it("parses entries with rel=alternate links", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Atom Feed</title>
        <subtitle>desc</subtitle>
        <link rel="alternate" href="https://example.com"/>
        <entry>
          <title>Entry one</title>
          <link rel="alternate" href="https://example.com/e1"/>
          <id>urn:e1</id>
          <summary>Some text</summary>
          <published>2026-09-01T08:00:00Z</published>
        </entry>
      </feed>`;
    const parsed = parseFeed(xml);
    expect(parsed.title).toBe("Atom Feed");
    expect(parsed.articles).toHaveLength(1);
    expect(parsed.articles[0].link).toBe("https://example.com/e1");
    expect(parsed.articles[0].description).toBe("Some text");
  });
});

describe("parseFeed error handling", () => {
  it("throws on malformed XML", () => {
    expect(() => parseFeed("<rss><channel><title>oops</channel></rss>")).toThrow();
  });

  it("throws when the document is neither RSS nor Atom", () => {
    expect(() => parseFeed("<html><body>not a feed</body></html>")).toThrow(/non riconosciuto/);
  });
});

describe("isLatin1Family", () => {
  it("recognizes ISO-8859-1 / Windows-1252 charset labels regardless of case/hyphenation", () => {
    for (const label of ["ISO-8859-1", "iso8859-1", "latin1", "windows-1252", "cp-1252", "x-cp1252"]) {
      expect(isLatin1Family(label)).toBe(true);
    }
  });

  it("does not match unrelated charsets", () => {
    expect(isLatin1Family("utf-8")).toBe(false);
    expect(isLatin1Family("windows-1251")).toBe(false);
  });
});

describe("decodeWindows1252", () => {
  it("maps the Windows-1252 smart-quote/dash range instead of leaving raw C1 control codes", () => {
    // Titolo Il Messaggero reale: "...l'Italia" con apostrofo tipografico
    // (byte 0x92), dichiarato come ISO-8859-1 ma da trattare come
    // Windows-1252 — altrimenti 0x92 decodifica a U+0092 (invisibile/"?").
    const bytes = new Uint8Array([0x6c, 0x92, 0x49, 0x74, 0x61, 0x6c, 0x69, 0x61]); // "l" 0x92 "Italia"
    expect(decodeWindows1252(bytes)).toBe("l’Italia");
  });

  it("still decodes plain ISO-8859-1 bytes (e.g. è, «, ») unchanged", () => {
    const bytes = new Uint8Array([0x63, 0x61, 0x66, 0x66, 0xe8, 0x20, 0xab, 0xbb]); // "caff" è " " « »
    expect(decodeWindows1252(bytes)).toBe("caffè «»");
  });
});

describe("discoverFeedUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function fakeXmlResponse(text) {
    return {
      ok: true,
      headers: { get: () => "application/xml; charset=utf-8" },
      arrayBuffer: async () => new TextEncoder().encode(text).buffer,
    };
  }

  const rssXml =
    '<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>' +
    '<item><title>A</title><link>https://example.com/a</link></item></channel></rss>';

  it("falls back to common feed paths (e.g. /feed) when the homepage itself can't be fetched", async () => {
    // Riproduce angrymetalguy.com: la home è irraggiungibile dal browser
    // (bloccata da CORS/anti-bot) ma il feed a un percorso comune sì.
    const pageUrl = "https://www.example.com";
    const feedUrl = "https://www.example.com/feed";
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (String(url) === feedUrl) return Promise.resolve(fakeXmlResponse(rssXml));
        return Promise.reject(new Error("network fail"));
      })
    );
    const found = await discoverFeedUrl(pageUrl);
    expect(found).toBe(feedUrl);
  });
});
