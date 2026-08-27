# AldusRSS

**[⬇ Scarica l'ultima release (APK Android)](https://github.com/andreacorinti/aldusrss/releases/latest)**

Un lettore RSS che compone da solo un giornale personale: pesca articoli da tutte le fonti a cui sei iscritto, li smista in sezioni tematiche (Sport, Tecnologia, Cultura...) e impagina ogni sezione con una propria identità editoriale — masthead, tipografia, colori — invece del solito elenco di card uniformi.

> Il nome è un omaggio ad **Aldo Manuzio**, lo stampatore veneziano che a fine '400 inventò il corsivo tipografico e il libro tascabile, portando cura editoriale e leggibilità in ogni pagina uscita dalla sua Aldine Press. Lo stesso principio qui: ogni sezione del tuo giornale merita un'impaginazione pensata per lei, non un template unico appiattito su tutto.

**Stato:** prototipo funzionante (React + Capacitor), con build Android firmata pronta per il sideload. In preparazione la pubblicazione su Play Store. Vedi [Roadmap](#roadmap).

## Come funziona

Carica feed RSS/Atom reali — di default ANSA, Sky Sport, DDay.it, Il Sole 24 Ore, RaiNews e Sky TG24 (modificabili dalla scheda "Feed") — ne unisce gli articoli e li smista automaticamente in sezioni:

- **Prima Pagina** — vista composta trasversale, i più rilevanti da tutte le fonti/sezioni, con priorità a cronaca/economia sull'apertura come in un vero giornale
- **Attualità, Economia** — impaginazione classica ("quotidiano")
- **Sport** — palette ad alto contrasto, titoli in condensato ("sportivo")
- **Tecnologia** — layout più visuale, titoli in corsivo ("magazine")
- **Cultura** (spettacolo incluso) — titoli in corsivo elegante ("rivista")

Ogni sezione ha una propria identità editoriale — colore, carta, tipografia dei titoli — ma la testata "AldusRSS" in cima resta sempre nello stesso font, per restare riconoscibile: solo il colore di "RSS" segue il tema della sezione aperta. Ogni sezione mostra solo se ha almeno un articolo, ed è nascondibile e riordinabile dalle Impostazioni. Nessun contatore di "non letti": il giornale si aggiorna da solo, trascina verso il basso per aggiornarlo quando vuoi tu.

Altre funzioni:
- **"Scopri fonti consigliate"** (scheda Feed): pacchetti di feed verificati per tema, da aggiungere in blocco (`src/lib/curatedFeeds.js`) — oltre alle sezioni dell'app, anche fonti in inglese (BBC, Guardian, NPR) e due pacchetti "nerd" (videogiochi, anime, manga) in italiano e in inglese
- **Autodiscovery**: aggiungi una fonte con il solo indirizzo del sito (es. `corriere.it`), non serve l'URL esatto del feed
- **Peso per fonte**: quanto spesso una fonte compare in evidenza in Prima Pagina (Basso/Normale/Alto)
- **Lingua dell'interfaccia** automatica dalla lingua di sistema (italiano se il sistema è in italiano, inglese altrimenti — nessun selettore manuale, per restare più snella), **modalità notte** dedicata per ogni template

### Avviare in locale

```bash
npm install
npm run dev
```

Apri l'indirizzo che compare in terminale (di solito `http://localhost:5173`).

### Build Android (Capacitor)

Richiede un Android SDK installato (`ANDROID_HOME` impostato, licenze accettate) — vedi la [guida Capacitor](https://capacitorjs.com/docs/android).

```bash
npm run android:build   # APK di debug, in android/app/build/outputs/apk/debug/
```

**Build di release firmata**, per il sideload o il Play Store (`npm run android:build:release` per l'APK, `android:bundle:release` per l'AAB): serve una chiave di firma propria, mai committata:

```bash
keytool -genkeypair -v -keystore ~/percorso/a-tua-scelta/aldusrss-release.jks \
  -alias aldusrss -keyalg RSA -keysize 2048 -validity 10000
```

poi un `android/keystore.properties` (già in `.gitignore`) con `storeFile`/`storePassword`/`keyAlias`/`keyPassword`. **Fai un backup del file `.jks` e delle password** (es. password manager): perderli, senza aver abilitato "Play App Signing" al primo caricamento su Play Console, impedisce per sempre aggiornamenti futuri con la stessa identità dell'app.

## Idea di fondo

I social network si sono progressivamente sostituiti all'RSS come principale via di accesso alle notizie: resti dentro un ecosistema chiuso, l'editore perde il controllo del proprio pubblico. AldusRSS torna a un'idea più vecchia — l'RSS — che porta traffico reale alle testate: ogni articolo linka all'originale, mai una copia interna.

I lettori RSS esistenti mostrano tutte le fonti con lo stesso template a card, o le tengono separate come inbox da svuotare. AldusRSS si comporta invece come un giornale vero: pesca da più testate e le organizza per argomento, non per fonte. In "Prima Pagina" gli articoli vengono ordinati per recency, pesata dal peso che assegni a ciascuna fonte e da un fattore fisso per sezione (Attualità/Economia favorite sull'apertura rispetto a Sport/Tecnologia/Cultura, salvo notizie eccezionali) — non un vero giudizio editoriale su cosa sia importante, solo un'approssimazione onesta e più vicina a come funziona davvero un giornale.

## Limiti noti

- **Proxy CORS**: molti feed non inviano header CORS, quindi il fetch diretto dal browser fallisce. Si ricade su una catena di proxy pubblici (`src/lib/rss.js`) — un workaround client-side best-effort, non un'infrastruttura nostra.
- **Autodiscovery da un sito**: stesso limite di sopra, aggravato dal peso di una homepage rispetto a un feed XML — i proxy CORS gratuiti spesso rifiutano payload grandi. Resta comunque possibile incollare il link diretto al feed.
- **Corpo articolo**: molti feed pubblicano solo un riassunto, non il testo integrale — da qui il link "Leggi l'articolo originale".
- **Classificazione in sezioni**: euristica a parole chiave (IT+EN, per confine di parola intero) su categorie/titolo — non una vera comprensione del testo, può sbagliare su fonti generaliste o feed senza categorie.
- **Ranking di Prima Pagina**: recency × peso fonte × fattore per sezione, non un vero giudizio editoriale — l'"importanza" di una notizia resta indecidibile in automatico.
- **Feed abbandonati lato editore**: alcuni publisher smettono di aggiornare un feed senza dismetterlo (risponde 200, ma contenuti fermi a mesi/anni fa — capitato a Gazzetta dello Sport e Corriere.it, non più tra i default). La scheda "Feed" lo segnala per fonte quando succede.

## Roadmap

**Fatto**: parsing RSS/Atom reale, aggregazione multi-fonte a sezioni tematiche con peso configurabile e tetto massimo di 2 articoli per fonte in Prima Pagina, pacchetti di feed curati da importare in blocco (incluse fonti in inglese e due pacchetti "nerd" videogiochi/anime/manga), 4 template editoriali con modalità notte e masthead fissa (solo il colore segue la sezione), lingua auto IT/EN senza selettore manuale, autodiscovery feed da sito con validazione prima di aggiungere una fonte (niente più voci fantasma per un indirizzo sbagliato) e conferma prima di rimuoverne una, sezioni riordinabili, aggiornamento a trascinamento (rimosso il bottone manuale ridondante), app Android (Capacitor) con icona dedicata, build di release firmata pronta per sideload/Play Store.

**Prossimi passi**:
- [ ] Pubblicazione su Play Store (account verificato, configurazione pronta — vedi `docs/store/`) e valutazione F-Droid
- [ ] Splash screen dedicato (oggi quello di default di Capacitor)
- [ ] Strategia per un pubblico internazionale più ampia (oltre il pacchetto fonti in inglese già disponibile) — da ripensare con calma
- [ ] Ranking di Prima Pagina più sofisticato (oltre recency + peso + fattore sezione)
- [ ] Motore di ricerca feed più ampio (oltre l'autodiscovery da un sito già noto) — richiederebbe un servizio esterno terzo
- [ ] App desktop Windows/Linux/macOS via **Tauri**, poi iOS — dopo Android

Lettura offline: non prioritaria — il valore reale è già coperto dalla cache esistente (ultimo elenco disponibile anche senza rete), mentre il testo integrale degli articoli resta comunque sui siti delle fonti.

Cronologia dettagliata di bug trovati e corretti (specie testando su dispositivo Android reale) nei [commit](https://github.com/andreacorinti/aldusrss/commits/master) e nelle [release](https://github.com/andreacorinti/aldusrss/releases).

## Privacy e permessi

L'app Android chiede un solo permesso: **`INTERNET`**. Nessun tracciamento, nessun account, nessun server nostro: i dati (feed sottoscritti, preferenze) restano solo sul dispositivo. Informativa completa: [andreacorinti.github.io/aldusrss/privacy.html](https://andreacorinti.github.io/aldusrss/privacy.html).

## Stack

React + Vite + Tailwind CSS, incapsulato con **Capacitor** per Android/iOS e (in futuro) **Tauri** per desktop — scelto rispetto a una riscrittura nativa perché riusa quasi interamente `src/lib/*.js` (parsing feed, classificazione, storage, i18n) e per l'ottimo supporto Linux di Tauri. Discussione in [#3](https://github.com/andreacorinti/aldusrss/issues/3).

## Contribuire

Il progetto è agli inizi: idee, feedback sui layout e proposte di template editoriali sono benvenuti. Apri una issue per discuterne prima di una PR corposa.

## Licenza

Distribuito con licenza MIT — vedi [LICENSE](./LICENSE).
