// Accetta anche "corriere.it" oltre a un URL completo, per permettere di
// incollare l'indirizzo di un sito (l'autodiscovery in addFeed troverà il feed).
//
// Il controllo sull'hostname è necessario, non solo prudente: senza,
// digitare una frase qualunque ("il mio giornale di Verona") produceva un
// URL sintatticamente valido (gli spazi diventano %20 nell'hostname) ma
// ovviamente inutile — veniva accettato in silenzio, lasciato fallire dopo
// una lunga attesa e restava in elenco per sempre con un errore tecnico
// incomprensibile (trovato testando con un profilo non tecnico). Un
// hostname vero non contiene spazi/percent-encoding e ha almeno un punto.
export function normalizeUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    try {
      url = new URL(`https://${input}`);
    } catch {
      return null;
    }
  }
  if (!/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes(".")) {
    return null;
  }
  return url.href;
}
