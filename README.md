# AldusRSS

Un lettore RSS che impagina automaticamente ogni fonte come una vera testata: masthead, tipografia e griglia cambiano in base al feed, invece del solito elenco di card uniformi.

> Il nome è un omaggio ad **Aldo Manuzio**, lo stampatore veneziano che a fine '400 inventò il corsivo tipografico e il libro tascabile (l'*enchiridion*), portando cura editoriale e leggibilità in ogni pagina che usciva dalla sua Aldine Press. Lo stesso principio applicato qui: ogni fonte merita un'impaginazione pensata per lei, non un template unico appiattito su tutte.

> **Stato del progetto:** prototipo web (React) con parsing reale dei feed RSS/Atom e classificazione automatica del layout. Non è ancora un'app Android — vedi [Roadmap](#roadmap).

## Demo

Il prototipo carica feed RSS/Atom reali (di default ANSA, Wired Italia, Gazzetta dello Sport, modificabili dalla scheda "Feed") e assegna automaticamente uno dei modelli editoriali disponibili in base al contenuto del feed:

- **Quotidiano** — generalista, impaginazione classica (default)
- **Magazine** — layout più visuale, masthead in corsivo
- **Sportivo** — masthead condensato ad alto contrasto

### Avviare la demo in locale

```bash
npm install
npm run dev
```

Poi apri l'indirizzo che compare in terminale (di solito `http://localhost:5173`).

## Idea di fondo

I lettori RSS esistenti (Feedly, Inoreader, Flipboard...) mostrano tutte le fonti con lo stesso template a card. L'obiettivo di AldusRSS è diverso: ogni fonte a cui ti iscrivi ottiene un proprio "modello editoriale" — assegnato automaticamente in base a euristiche (parole chiave nel titolo/descrizione del feed, presenza di immagini negli articoli) o scelto manualmente dall'utente — così da leggere ogni sito com'era pensato per essere letto, non appiattito in una lista.

## Limiti noti

- **Proxy CORS**: molti feed non inviano header `Access-Control-Allow-Origin`, quindi il browser non può scaricarli direttamente. Il prototipo prova prima il fetch diretto e, se fallisce, ricade su un proxy CORS pubblico (`api.allorigins.win`) — un workaround client-side best-effort, non sempre disponibile. La costante è isolata in `src/lib/rss.js` ed è facile da sostituire. Il problema sparirà passando a un'app nativa (fetch senza restrizioni CORS).
- **Corpo articolo**: molti feed pubblicano solo un riassunto, non il testo integrale. La vista articolo mostra quello che il feed fornisce, con un link "Leggi l'articolo originale" verso la fonte.

## Roadmap

- [x] Prototipo visivo dei layout
- [x] Parsing reale dei feed RSS/Atom
- [x] Motore di classificazione automatica (template per fonte, hero/secondaria/in breve per articolo)
- [ ] Libreria di un 4° template editoriale (es. cultura/opinione)
- [ ] App mobile (Flutter o React Native) con lettura offline
- [ ] Build APK distribuita via GitHub Releases / F-Droid

## Stack

- Prototipo: React + Vite + Tailwind CSS
- App finale (da definire): probabilmente Flutter, per avere Android/iOS dallo stesso codice

## Contribuire

Il progetto è agli inizi: idee, feedback sui layout e proposte di template editoriali sono benvenuti. Apri una issue per discuterne prima di una PR corposa.

## Licenza

Distribuito con licenza MIT — vedi [LICENSE](./LICENSE).
