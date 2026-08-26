# Edicola

Un lettore RSS che impagina automaticamente ogni fonte come una vera testata: masthead, tipografia e griglia cambiano in base al feed, invece del solito elenco di card uniformi.

> **Stato del progetto:** prototipo visivo (React/web). Non è ancora un'app Android funzionante — vedi [Roadmap](#roadmap).

## Demo

Questo repo contiene un prototipo interattivo in React che simula l'interfaccia dell'app, con tre fonti di esempio (dati finti) per mostrare come cambia il layout:

- **La Cronaca** — quotidiano generalista, impaginazione classica
- **Pixel & Bit** — tecnologia, layout più visuale
- **Campo Aperto** — sport, masthead condensato ad alto contrasto

### Avviare la demo in locale

```bash
npm install
npm run dev
```

Poi apri l'indirizzo che compare in terminale (di solito `http://localhost:5173`).

## Idea di fondo

I lettori RSS esistenti (Feedly, Inoreader, Flipboard...) mostrano tutte le fonti con lo stesso template a card. L'obiettivo di Edicola è diverso: ogni fonte a cui ti iscrivi ottiene un proprio "modello editoriale" — assegnato automaticamente in base a euristiche (lunghezza dei testi, presenza di immagini, categoria del feed) o scelto manualmente dall'utente — così da leggere ogni sito com'era pensato per essere letto, non appiattito in una lista.

## Roadmap

- [x] Prototipo visivo dei layout (questo repo)
- [ ] Parsing reale dei feed RSS/Atom
- [ ] Motore di classificazione automatica degli articoli (breaking / approfondimento / foto-reportage)
- [ ] Libreria di 3-4 template editoriali riutilizzabili
- [ ] App mobile (Flutter o React Native) con lettura offline
- [ ] Build APK distribuita via GitHub Releases / F-Droid

## Stack

- Prototipo: React + Vite + Tailwind CSS
- App finale (da definire): probabilmente Flutter, per avere Android/iOS dallo stesso codice

## Contribuire

Il progetto è agli inizi: idee, feedback sui layout e proposte di template editoriali sono benvenuti. Apri una issue per discuterne prima di una PR corposa.

## Licenza

Distribuito con licenza MIT — vedi [LICENSE](./LICENSE).
