// Proxy CORS per AldusRSS, ospitato su Cloudflare Workers.
//
// Perché esiste: molte fonti RSS non mandano header CORS (verificato: 29 su
// 47 tra le fonti di default + pacchetti curati, agosto/settembre 2026),
// quindi un fetch diretto dal browser/WebView dell'app viene bloccato dalla
// same-origin policy. Finora l'app si appoggiava a proxy pubblici anonimi
// di terzi (corsproxy.io, poi allorigins.win, poi proxy.cors.sh) — tutti e
// tre morti o diventati inaffidabili senza preavviso nel giro di poche
// settimane/mesi. Questo worker toglie quella dipendenza: è sotto il
// controllo diretto del progetto, sul piano gratuito di Cloudflare
// (100.000 richieste/giorno, ampiamente sufficiente per l'uso reale
// dell'app).
//
// Uso: GET https://<questo-worker>.workers.dev/?url=<url-target-encoded>
// Risponde con lo stesso corpo/content-type della risorsa target, con
// Access-Control-Allow-Origin: * (sicuro qui: la risorsa proxata è sempre
// un feed RSS pubblico, nessuna credenziale/cookie in gioco).
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
    }

    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get("url");
    if (!target) {
      return new Response("Missing ?url= parameter", { status: 400, headers: corsHeaders() });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Invalid target URL", { status: 400, headers: corsHeaders() });
    }
    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      return new Response("Only http/https targets are allowed", { status: 400, headers: corsHeaders() });
    }

    let upstream;
    try {
      upstream = await fetch(targetUrl.href, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AldusRSS-CORS-Proxy)" },
        redirect: "follow",
      });
    } catch (err) {
      return new Response(`Upstream fetch failed: ${err.message}`, { status: 502, headers: corsHeaders() });
    }

    const headers = corsHeaders();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    return new Response(upstream.body, { status: upstream.status, headers });
  },
};

function corsHeaders() {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  });
}
