# AldusRSS

Un lettore RSS che compone da solo un giornale personale: pesca articoli da tutte le fonti a cui sei iscritto, li smista in sezioni tematiche (Sport, Tecnologia, Cultura...) e impagina ogni sezione con una propria identità editoriale — masthead, tipografia, colori — invece del solito elenco di card uniformi.

> Il nome è un omaggio ad **Aldo Manuzio**, lo stampatore veneziano che a fine '400 inventò il corsivo tipografico e il libro tascabile (l'*enchiridion*), portando cura editoriale e leggibilità in ogni pagina che usciva dalla sua Aldine Press. Lo stesso principio applicato qui: ogni sezione del tuo giornale merita un'impaginazione pensata per lei, non un template unico appiattito su tutto.

> **Stato del progetto:** prototipo web (React) con parsing reale dei feed RSS/Atom, aggregazione multi-fonte e classificazione automatica in sezioni. Lo scaffolding Android (Capacitor) è pronto e produce un APK funzionante — priorità attuale, prima di desktop e iOS. Vedi [Roadmap](#roadmap).

## Demo

Il prototipo carica feed RSS/Atom reali — di default ANSA (generalista + feed dedicati a Economia e Cultura), Wired Italia, Sky Sport, HDblog.it, Il Sole 24 Ore (Economia), RaiNews e Sky TG24, modificabili dalla scheda "Feed" — ne unisce gli articoli e li smista automaticamente in sezioni:

- **Prima Pagina** — vista composta trasversale, i più rilevanti da tutte le fonti/sezioni
- **Attualità, Economia** — impaginazione classica ("quotidiano")
- **Sport** — masthead condensato ad alto contrasto
- **Tecnologia** — layout più visuale, masthead in corsivo ("magazine")
- **Cultura** (include anche lo spettacolo: cinema, tv, musica) — masthead elegante in corsivo ("rivista")

(Le sezioni Mondo e Gossip, presenti in una versione precedente, sono state rimosse: nessuna delle fonti disponibili le alimentava abbastanza da renderle utili, e complicavano la classificazione senza un vantaggio reale. Lo spettacolo è confluito in Cultura, come fanno molti quotidiani italiani.)

Ogni sezione mostra solo se ha almeno un articolo, ed è nascondibile e riordinabile dalle Impostazioni. Nessun contatore di "non letti": il giornale si aggiorna da solo, lo apri quando vuoi tu.

Per aggiungere una fonte non serve trovare e incollare l'URL esatto del feed: basta l'indirizzo del sito (es. `corriere.it`) e AldusRSS prova a scoprire da solo il feed collegato, leggendo il tag standard che il sito stesso dichiara nella pagina (lo stesso meccanismo di "autodiscovery" usato da tutti i lettori RSS). Se il sito non lo dichiara, o se la pagina è troppo pesante per i proxy CORS pubblici, resta comunque possibile incollare il link diretto al feed.

L'interfaccia è disponibile in italiano e inglese (le Impostazioni hanno un selettore Automatica/Italiano/English — "Automatica" segue la lingua del browser, l'equivalente web della lingua di sistema che leggerebbe un'app nativa Android/iOS). Cambia solo la lingua dell'interfaccia: i contenuti dei feed restano nella lingua originale della fonte. C'è anche una modalità notte, con un tema scuro dedicato per ognuno dei 4 stili editoriali.

### Avviare la demo in locale

```bash
npm install
npm run dev
```

Poi apri l'indirizzo che compare in terminale (di solito `http://localhost:5173`).

### Build Android (Capacitor)

Richiede un Android SDK installato (`ANDROID_HOME` impostato, licenze accettate) — vedi la [guida Capacitor](https://capacitorjs.com/docs/android) se non l'hai già.

```bash
npm run android:build
```

Compila il sito, sincronizza la cartella `android/` e genera un APK di debug in `android/app/build/outputs/apk/debug/app-debug.apk`, installabile su un dispositivo o emulatore per test (`adb install app-debug.apk`).

### Distribuzione e firma (release)

Un APK di debug è firmato con una chiave generica, la stessa su ogni macchina che usa gli SDK Android di default — installarlo fuori dall'IDE (es. da una GitHub Release) fa scattare più facilmente gli avvisi di Play Protect ("app potenzialmente dannosa"), a prescindere da cosa fa davvero l'app. Una build di release firmata con una chiave propria, univoca, riduce questo rischio (non lo azzera: l'avviso "installa da fonte sconosciuta" resta comunque, è una protezione di Android per qualunque APK che non venga dal Play Store — sparisce solo pubblicando lì).

Per generare una build di release serve una chiave di firma, mai committata nel repository:

```bash
keytool -genkeypair -v -keystore ~/percorso/a-tua-scelta/aldusrss-release.jks \
  -alias aldusrss -keyalg RSA -keysize 2048 -validity 10000
```

Poi crea `android/keystore.properties` (già in `.gitignore`, non verrà mai committato):

```properties
storeFile=/percorso/assoluto/a/aldusrss-release.jks
storePassword=...
keyAlias=aldusrss
keyPassword=...
```

A quel punto:

```bash
npm run android:build:release   # APK firmato, per GitHub Releases / sideload diretto
npm run android:bundle:release  # AAB firmato, per il Play Store (richiede il formato AAB, non APK)
```

**Importante**: senza backup del file `.jks` e delle password (es. in un password manager), un giorno perso quel file significa non poter più pubblicare aggiornamenti dell'app con la stessa identità — Play Store e Android rifiutano un aggiornamento firmato con una chiave diversa da quella originale. Se al primo caricamento su Play Console si abilita "Play App Signing" (Google gestisce la vera chiave dell'app, la propria diventa solo una "chiave di caricamento"), la perdita è recuperabile tramite una procedura di Google; altrimenti no.

## Idea di fondo

I social network si sono progressivamente sostituiti all'RSS come principale via di accesso alle notizie: l'utente resta dentro un ecosistema chiuso (anteprime, riassunti, feed algoritmico), l'editore perde il controllo del proprio pubblico e gran parte del traffico diretto al sito. AldusRSS è un tentativo deliberato di tornare a un sistema più vecchio — l'RSS — che invece porta traffico reale alle testate: ogni articolo linka all'originale, "Leggi l'articolo originale" apre il sito della fonte, non una copia interna. L'obiettivo non è sostituirsi ai giornali né trattenere l'attenzione al posto loro, ma restituire centralità a chi le notizie le scrive — lontano dalla logica delle piattaforme chiuse che redistribuiscono poco o nulla a chi produce l'informazione.

I lettori RSS esistenti (Feedly, Inoreader, Flipboard...) o mostrano tutte le fonti con lo stesso template a card, oppure le tengono separate come inbox distinte da svuotare. AldusRSS prova un'idea diversa: comportarsi come un giornale vero, che pesca da più testate e le organizza per argomento invece che per fonte. Ogni articolo viene classificato in una sezione (in base alle categorie native del feed, quando presenti, altrimenti al titolo) e ogni sezione ha una propria identità editoriale. In "Prima Pagina" gli articoli di tutte le sezioni vengono ordinati per recency, pesata da quanto l'utente considera importante ciascuna fonte (impostabile in "Feed") e da un fattore fisso per sezione che rispecchia una convenzione editoriale reale: a parità di freschezza, Attualità ed Economia hanno la priorità su Sport/Tecnologia/Cultura per la notizia di apertura — come in un vero giornale, dove la prima pagina apre con la cronaca del giorno, non con lo sport, salvo eventi eccezionali (una finale, un crollo di mercato). Resta comunque un'approssimazione onesta, non un vero giudizio editoriale su cosa sia importante.

## Limiti noti

- **Proxy CORS**: molti feed non inviano header `Access-Control-Allow-Origin`, quindi il browser non può scaricarli direttamente. Il prototipo prova prima il fetch diretto e, se fallisce, ricade su una catena di proxy CORS pubblici (con timeout per tentativo, così uno "appeso" non blocca gli altri) — un workaround client-side best-effort, non un'infrastruttura nostra. L'elenco è isolato in `src/lib/rss.js` ed è facile da estendere. Il problema si riduce molto passando a Capacitor/Tauri: restano comunque un motore web, ma senza le restrizioni CORS del browser sandboxato su un dominio pubblico.
- **Autodiscovery del feed da un sito**: stesso meccanismo e stessi limiti del punto sopra, aggravati dal fatto che una homepage pesa in genere molto più di un feed XML (verificato: 1MB+ per diverse testate) — i proxy CORS pubblici gratuiti spesso rifiutano payload di quella dimensione. Funziona in modo affidabile quando il sito invia header CORS permissivi anche sulla homepage (raro) o quando la pagina è leggera; altrimenti va ancora incollato il link diretto al feed.
- **Corpo articolo**: molti feed pubblicano solo un riassunto, non il testo integrale. La vista articolo mostra quello che il feed fornisce, con un link "Leggi l'articolo originale" verso la fonte.
- **Classificazione in sezioni**: è un'euristica a parole chiave (IT+EN, per confine di parola intero — non una sottostringa qualunque) sulle categorie/titolo dell'articolo, non una vera comprensione del testo — può sbagliare, specie su fonti generaliste che trattano molti temi o su feed senza categorie (un titolo come "Disco del Mese" non contiene alcuna parola chiave riconoscibile, quindi finisce nella sezione di default invece che in Cultura). Le fonti a tema unico (es. Sky Sport) hanno un `sectionHint` di ripiego, usato solo quando nessuna parola chiave trova un match reale altrove: senza, finivano quasi tutte nella sezione di default.
- **Ranking di Prima Pagina**: recency × peso fonte configurabile × un fattore fisso per sezione (Attualità/Economia favorite sullo sport per l'apertura, vedi sopra) — non un vero giudizio editoriale su cosa sia importante (l'"importanza" di una notizia resta indecidibile in automatico), solo un'approssimazione più vicina a come funziona davvero un giornale.
- **Feed abbandonati lato editore**: alcuni publisher smettono di aggiornare un feed pubblico senza dismetterlo (risponde 200, header di cache "freschi", ma contenuti fermi a mesi o anni fa — verificato anche su corriere.it, fermo dal 2024) — non distinguibile da un feed sano se non guardando le date reali degli articoli. La scheda "Feed" segnala questo caso per fonte ("raggiungibile ma senza notizie recenti pubblicate"); se capita a una fonte di default, la sezione mostra invece l'avviso "nessun articolo recente" sull'articolo in evidenza.

## Roadmap

- [x] Prototipo visivo dei layout
- [x] Parsing reale dei feed RSS/Atom
- [x] Aggregazione multi-fonte in un giornale composto a sezioni tematiche, con peso fonte configurabile
- [x] Libreria di un 4° template editoriale ("rivista", per Cultura)
- [x] Prima fonte in inglese per testare l'aggregazione multilingua (BBC News — poi tolta dai default, vedi sotto: l'aggregazione multilingua resta pronta e testata, la strategia sul pubblico internazionale è da ripensare)
- [x] Modalità notte (tema scuro per ognuno dei 4 template editoriali, segue il sistema finché non la imposti tu)
- [x] Interfaccia in italiano/inglese, con rilevamento automatico della lingua (in ottica app nativa, dove verrebbe letta dal sistema)
- [x] Sezioni riordinabili dall'utente, oltre a mostra/nascondi
- [x] Autodiscovery del feed a partire dall'indirizzo di un sito, invece di dover copiare l'URL esatto del feed
- [x] Scaffolding Android via Capacitor, con build APK di debug funzionante (`npm run android:build`)

### Piano per il futuro (priorità: Android prima del resto)

- [x] Prima Pagina monopolizzata da una singola fonte (tetto per fonte in hero+secondaria+in breve, `bucketArticles`)
- [ ] Menù hamburger in alto a sinistra senza funzione: dargli uno scopo reale o rimuoverlo
- [x] Riordino sezioni: sostituito il trascinamento (inaffidabile su dispositivo reale) con frecce su/giù
- [x] BBC News tolta dalle fonti di default (solo italiane per ora)
- [x] Gazzetta dello Sport tolta dai default (feed abbandonato lato editore, contenuti fermi al 2023/2024): sostituita da Sky Sport
- [x] Bug immagini Wired: `<media:content/>` vuoto veniva letto prima di `<media:thumbnail/>`, scartando l'immagine reale
- [x] Aggiornamento con trascinamento: indicatore con etichetta "Trascina/Rilascia per aggiornare" e resistenza elastica oltre la soglia, invece dello snap secco iniziale
- [x] Bug parsing date in italiano (es. Sky Sport: "gio, 27 ago…"): `Date.parse` nativo capisce solo l'inglese, articoli di oggi trattati come "senza data"
- [x] Bug classificazione per sottostringa (es. "arte" dentro "partecipanti"): passato a un match per confine di parola intero
- [x] Attualità monopolizzata da Sky Sport: aggiunto `sectionHint` di ripiego per le fonti a tema unico
- [x] Economia/Tecnologia con notizie vecchie (Wired aggiorna il proprio feed con settimane di ritardo, verificato lato editore): aggiunte ANSA Economia e HDblog.it come fonti di default aggiuntive, verificate aggiornate in giornata
- [x] `sectionHint` troppo aggressivo su HDblog.it: non è una fonte a tema unico (pubblica anche contenuto generalista, es. "Bollette e caro vita"), l'hint forzava tutto dentro Tecnologia — rimosso, si affida al match a parole chiave (aggiunte "android"/"iphone"/ecc.)
- [x] Cultura senza fonti fresche (solo Wired, stesso problema di Economia): aggiunta ANSA Cultura
- [x] Prima Pagina: la vetrina (hero+secondaria) poteva comunque ripiegare su un pezzo vecchio se nessun'altra fonte-con-immagine fresca era disponibile — ora la vetrina non pesca mai dal non-fresco (meglio una riga più corta), "in breve" resta più permissivo
- [x] **Bug reale trovato su dispositivo/emulatore Android**: il trascinamento per aggiornare sembrava "uno scatto senza feedback" perché il WebView riconosceva il gesto come scroll nativo dopo pochi pixel e smetteva di consegnare eventi a React — serviva un listener `touchmove` esplicitamente non passivo (invisibile nei test da browser desktop, dove i pointer event sintetici non passano dalla stessa pipeline touch)
- [x] Bottone di aggiornamento manuale: mostrava "Rilascia per aggiornare" (frase senza senso se non si è trascinato nulla) invece di "Aggiornamento in corso…"
- [x] **Regressione**: il fix del trascinamento (sopra) bloccava anche il normale scroll verso il basso quando il tocco iniziava dalla cima della pagina — il listener `touchmove` sopprimeva lo scroll nativo per qualunque tocco partito a scrollTop 0, non solo per un vero trascinamento verso il basso. Corretto calcolando la direzione dalle coordinate touch, non solo dal fatto che si sia iniziato a tracciare
- [x] Sky Sport troppo presente in Prima Pagina (pubblica più volte ogni 10 minuti, vince il ranking a sola recency anche con notizie sportive minori): peso di default ridotto a 0.5, e il tetto per fonte in "in breve" di Prima Pagina abbassato da 2 a 1
- [x] **Bug strutturale trovato testando con più fonti**: hero e secondaria richiedevano un'immagine reale per essere scelti — fonti serie ma senza immagini (ANSA, Il Fatto Quotidiano) restavano sempre escluse dalla vetrina qualunque fosse il loro peso, mentre una fonte meno prioritaria ma "fotografata" (Sky Sport, HDblog) vinceva comunque. Rimosso il requisito per l'hero: ora vince il punteggio reale (recency × peso), l'immagine mostrata resta comunque un placeholder quando manca quella vera
- [x] Sezioni Mondo e Gossip rimosse: nessuna fonte disponibile le alimentava a sufficienza, complicavano la classificazione senza vantaggio reale — lo spettacolo (cinema, tv, musica) è confluito in Cultura
- [x] Sistema di peso poco chiaro (un singolo bottone con una lettera, da toccare a ciclo, senza indicare le altre opzioni): sostituito con un controllo a 3 segmenti (Basso/Normale/Alto) sempre visibile, valutato anche un riordino per posizione in stile sezioni ma scartato — con più fonti un peso diretto resta più preciso di una posizione in lista da reinterpretare
- [x] Corriere.it non mostrava nulla dopo l'aggiunta: il suo feed RSS (trovato dal fallback su percorsi comuni) è anch'esso abbandonato lato editore, fermo al 2024 — non un bug nostro, ma ora la scheda "Feed" segnala esplicitamente per fonte "raggiungibile ma senza notizie recenti pubblicate" invece di restare silenziosa
- [x] Aggiunte 3 fonti verificate (aggiornate in giornata, con curl) per test più approfonditi: Il Sole 24 Ore (Economia), RaiNews (categorie native ricche, si classifica bene da sola) e Sky TG24 (stesso editore/pattern di Sky Sport, peso ridotto di default per lo stesso motivo)
- [x] La notizia di apertura di Prima Pagina finiva a tema sportivo/tech troppo spesso anche senza eventi eccezionali: aggiunto un fattore fisso per sezione nel ranking (solo per Prima Pagina, mai per la sezione stessa), che rispecchia la convenzione reale per cui un giornale apre con la cronaca, non con lo sport, salvo occasioni speciali
- [ ] Strategia per un pubblico internazionale (quali lingue, quali fonti EN) — da ripensare con calma, non di corsa
- [ ] Lettura offline su Android (cache articoli, già presente per il fallback web, da estendere)
- [x] Icona app dedicata (monogramma "A" in Fraunces su rosso, coerente col masthead)
- [ ] Splash screen dedicato (oggi quello di default di Capacitor)
- [x] Build di release firmata (`npm run android:build:release` / `android:bundle:release`), chiave propria generata e configurata — vedi README, sezione Distribuzione
- [ ] Pubblicazione su Play Store (account developer creato, in attesa di verifica identità) e valutazione F-Droid
- [ ] Ranking di Prima Pagina più sofisticato (oltre recency + peso fonte)
- [ ] Altre fonti EN di test e altre lingue oltre IT/EN (interfaccia e contenuti)
- [ ] Motore di ricerca feed più ampio (oltre l'autodiscovery da un sito già noto) — richiederebbe un servizio esterno terzo, da valutare con calma
- [ ] App desktop Windows/Linux/macOS via **Tauri** — dopo Android
- [ ] iOS — dopo Android

## Privacy e permessi

L'app Android chiede un solo permesso: **`INTERNET`**, indispensabile per scaricare i feed. Nient'altro — niente posizione, contatti, storage, fotocamera, microfono, notifiche push. (Il manifest elenca anche `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`: non è un permesso concesso dall'utente ma un meccanismo interno di sicurezza che Android genera automaticamente per le app che registrano ricevitori di broadcast dinamici — non ha impatto sulla privacy.) Nessun tracciamento, nessun account, nessun server nostro: i dati (feed sottoscritti, preferenze) restano solo sul dispositivo.

## Stack

- Prototipo: React + Vite + Tailwind CSS
- App finale: lo stesso codice React/JS, incapsulato con **Capacitor** per Android/iOS e **Tauri** per Windows/Linux/macOS — scelto rispetto a una riscrittura nativa (Flutter) o React Native perché riusa quasi interamente `src/lib/*.js` (parsing feed, classificazione, storage, i18n: già puro JS senza dipendenze da React/DOM) e perché Tauri ha un ottimo supporto Linux, punto debole di React Native. Vedi la discussione nella issue [#3](https://github.com/andreacorinti/aldusrss/issues/3).

## Contribuire

Il progetto è agli inizi: idee, feedback sui layout e proposte di template editoriali sono benvenuti. Apri una issue per discuterne prima di una PR corposa.

## Licenza

Distribuito con licenza MIT — vedi [LICENSE](./LICENSE).
