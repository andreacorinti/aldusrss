# AldusRSS

Un lettore RSS che compone da solo un giornale personale: pesca articoli da tutte le fonti a cui sei iscritto, li smista in sezioni tematiche (Sport, Tecnologia, Cultura...) e impagina ogni sezione con una propria identità editoriale — masthead, tipografia, colori — invece del solito elenco di card uniformi.

> Il nome è un omaggio ad **Aldo Manuzio**, lo stampatore veneziano che a fine '400 inventò il corsivo tipografico e il libro tascabile (l'*enchiridion*), portando cura editoriale e leggibilità in ogni pagina che usciva dalla sua Aldine Press. Lo stesso principio applicato qui: ogni sezione del tuo giornale merita un'impaginazione pensata per lei, non un template unico appiattito su tutto.

> **Stato del progetto:** prototipo web (React) con parsing reale dei feed RSS/Atom, aggregazione multi-fonte e classificazione automatica in sezioni. Non è ancora un'app installabile su telefono/desktop — vedi [Roadmap](#roadmap).

## Demo

Il prototipo carica feed RSS/Atom reali — di default ANSA, Wired Italia, Gazzetta dello Sport e **BBC News** (per testare l'aggregazione multilingua IT/EN), modificabili dalla scheda "Feed" — ne unisce gli articoli e li smista automaticamente in sezioni:

- **Prima Pagina** — vista composta trasversale, i più rilevanti da tutte le fonti/sezioni
- **Attualità, Mondo, Economia** — impaginazione classica ("quotidiano")
- **Sport** — masthead condensato ad alto contrasto
- **Tecnologia** — layout più visuale, masthead in corsivo ("magazine")
- **Cultura, Gossip** — masthead elegante in corsivo ("rivista")

Ogni sezione mostra solo se ha almeno un articolo, ed è nascondibile e riordinabile dalle Impostazioni. Nessun contatore di "non letti": il giornale si aggiorna da solo, lo apri quando vuoi tu.

Per aggiungere una fonte non serve trovare e incollare l'URL esatto del feed: basta l'indirizzo del sito (es. `corriere.it`) e AldusRSS prova a scoprire da solo il feed collegato, leggendo il tag standard che il sito stesso dichiara nella pagina (lo stesso meccanismo di "autodiscovery" usato da tutti i lettori RSS). Se il sito non lo dichiara, o se la pagina è troppo pesante per i proxy CORS pubblici, resta comunque possibile incollare il link diretto al feed.

L'interfaccia è disponibile in italiano e inglese (le Impostazioni hanno un selettore Automatica/Italiano/English — "Automatica" segue la lingua del browser, l'equivalente web della lingua di sistema che leggerebbe un'app nativa Android/iOS). Cambia solo la lingua dell'interfaccia: i contenuti dei feed restano nella lingua originale della fonte. C'è anche una modalità notte, con un tema scuro dedicato per ognuno dei 4 stili editoriali.

### Avviare la demo in locale

```bash
npm install
npm run dev
```

Poi apri l'indirizzo che compare in terminale (di solito `http://localhost:5173`).

## Idea di fondo

I lettori RSS esistenti (Feedly, Inoreader, Flipboard...) o mostrano tutte le fonti con lo stesso template a card, oppure le tengono separate come inbox distinte da svuotare. AldusRSS prova un'idea diversa: comportarsi come un giornale vero, che pesca da più testate e le organizza per argomento invece che per fonte. Ogni articolo viene classificato in una sezione (in base alle categorie native del feed, quando presenti, altrimenti al titolo) e ogni sezione ha una propria identità editoriale. In "Prima Pagina" gli articoli di tutte le sezioni vengono ordinati per recency, pesata da quanto l'utente considera importante ciascuna fonte (impostabile in "Feed") — non è un vero giudizio editoriale su cosa sia importante, solo un'approssimazione onesta e personalizzabile.

## Limiti noti

- **Proxy CORS**: molti feed non inviano header `Access-Control-Allow-Origin`, quindi il browser non può scaricarli direttamente. Il prototipo prova prima il fetch diretto e, se fallisce, ricade su una catena di proxy CORS pubblici (con timeout per tentativo, così uno "appeso" non blocca gli altri) — un workaround client-side best-effort, non un'infrastruttura nostra. L'elenco è isolato in `src/lib/rss.js` ed è facile da estendere. Il problema si riduce molto passando a Capacitor/Tauri: restano comunque un motore web, ma senza le restrizioni CORS del browser sandboxato su un dominio pubblico.
- **Autodiscovery del feed da un sito**: stesso meccanismo e stessi limiti del punto sopra, aggravati dal fatto che una homepage pesa in genere molto più di un feed XML (verificato: 1MB+ per diverse testate) — i proxy CORS pubblici gratuiti spesso rifiutano payload di quella dimensione. Funziona in modo affidabile quando il sito invia header CORS permissivi anche sulla homepage (raro) o quando la pagina è leggera; altrimenti va ancora incollato il link diretto al feed.
- **Corpo articolo**: molti feed pubblicano solo un riassunto, non il testo integrale. La vista articolo mostra quello che il feed fornisce, con un link "Leggi l'articolo originale" verso la fonte.
- **Classificazione in sezioni**: è un'euristica a parole chiave (IT+EN) sulle categorie/titolo dell'articolo, non una vera comprensione del testo — può sbagliare, specie su fonti generaliste che trattano molti temi.
- **Ranking di Prima Pagina**: solo recency × peso fonte configurabile, non un vero giudizio editoriale su cosa sia importante (l'"importanza" di una notizia resta indecidibile in automatico).

## Roadmap

- [x] Prototipo visivo dei layout
- [x] Parsing reale dei feed RSS/Atom
- [x] Aggregazione multi-fonte in un giornale composto a sezioni tematiche, con peso fonte configurabile
- [x] Libreria di un 4° template editoriale ("rivista", per Cultura/Gossip)
- [x] Prima fonte in inglese per testare l'aggregazione multilingua (BBC News)
- [x] Modalità notte (tema scuro per ognuno dei 4 template editoriali, segue il sistema finché non la imposti tu)
- [x] Interfaccia in italiano/inglese, con rilevamento automatico della lingua (in ottica app nativa, dove verrebbe letta dal sistema)
- [x] Sezioni riordinabili dall'utente, oltre a mostra/nascondi
- [x] Autodiscovery del feed a partire dall'indirizzo di un sito, invece di dover copiare l'URL esatto del feed

### Piano per il futuro

- [ ] Ranking di Prima Pagina più sofisticato (oltre recency + peso fonte)
- [ ] Altre fonti EN di test e altre lingue oltre IT/EN (interfaccia e contenuti)
- [ ] Motore di ricerca feed più ampio (oltre l'autodiscovery da un sito già noto) — richiederebbe un servizio esterno terzo, da valutare con calma
- [ ] App mobile Android/iOS via **Capacitor**, con lettura offline
- [ ] App desktop Windows/Linux/macOS via **Tauri**
- [ ] Build APK/eseguibili distribuiti via GitHub Releases / F-Droid

## Stack

- Prototipo: React + Vite + Tailwind CSS
- App finale: lo stesso codice React/JS, incapsulato con **Capacitor** per Android/iOS e **Tauri** per Windows/Linux/macOS — scelto rispetto a una riscrittura nativa (Flutter) o React Native perché riusa quasi interamente `src/lib/*.js` (parsing feed, classificazione, storage, i18n: già puro JS senza dipendenze da React/DOM) e perché Tauri ha un ottimo supporto Linux, punto debole di React Native. Vedi la discussione nella issue [#3](https://github.com/andreacorinti/aldusrss/issues/3).

## Contribuire

Il progetto è agli inizi: idee, feedback sui layout e proposte di template editoriali sono benvenuti. Apri una issue per discuterne prima di una PR corposa.

## Licenza

Distribuito con licenza MIT — vedi [LICENSE](./LICENSE).
