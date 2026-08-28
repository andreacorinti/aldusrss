# Checklist Play Console — AldusRSS (bozza, non pubblicata)

Non copre la creazione dell'app in Play Console (richiede il tuo login Google) — solo cosa preparare prima e come rispondere ai questionari, per farlo in 10 minuti invece che doverli reinterpretare sul momento.

## 1. Traccia consigliata: Internal testing, poi Closed testing (obbligatoria)

Non "Produzione" da subito. La traccia **Internal testing** (Rilascio > Test interni) resta il primo passo giusto:
- fino a 100 tester nominati via email (lista che gestisci tu, es. Google Group o lista diretta)
- nessuna revisione dei contenuti da parte di Google, va live in pochi minuti
- l'app resta privata, non compare mai nello store pubblico
- installi comunque *dal vero Play Store* (link diretto ai tester), quindi testi anche il flusso di installazione reale — cosa che un APK laterale non replica del tutto

**Ma non basta per arrivare in Produzione.** Per un account sviluppatore nuovo (il tuo caso), Google richiede in più una traccia **Closed testing** con **almeno 12 tester** che si iscrivono tramite il link di opt-in e restano iscritti per **almeno 14 giorni consecutivi** — solo dopo, Play Console sblocca la richiesta di accesso alla Produzione. Punti pratici:
- I 12 non bastano il giorno 1 e via: devono restare opt-in per l'intera finestra di 14 giorni — se qualcuno esce prima, verifica quanti resistono comunque a 12+.
- L'iscrizione avviene con il link "diventa tester" che Play Console genera per la traccia Closed testing (diverso dal link usato per Internal testing) — vanno reinvitati lì, non basta chi era già tester interno.
- Aprire l'app almeno una volta dopo essersi iscritti aiuta a contare come partecipazione attiva, non solo l'iscrizione.
- Gestire la lista con un **Google Group** (email dedicata, es. `aldusrss-testers@googlegroups.com`) è più comodo che aggiungere email singole in Play Console: aggiungi/rimuovi membri dal Gruppo senza toccare più la traccia.

Un testo pronto da mandare a chi vuoi invitare:

> Ciao! Sto testando AldusRSS, un'app Android che leggo per me: un lettore RSS che compone da solo un piccolo giornale personale dalle fonti che scegli. Mi serve che tu ti iscriva come tester su Google Play e tenga l'app installata per un paio di settimane (basta aprirla ogni tanto, non serve fare nulla di preciso). Ti mando il link di iscrizione appena pronto — grazie mille!

Quando sarai pronto per un pubblico più ampio, da Closed testing si passa a Open testing e poi Produzione senza dover rifare la configurazione.

## 2. File da caricare
`android/app/build/outputs/bundle/release/app-release.aab` (rigenerato a ogni release con `npm run android:bundle:release`) — Play Store richiede l'AAB, non l'APK, per i caricamenti.

## 3. App content (obbligatorio anche solo per Internal testing)

- **Privacy Policy URL**: `https://andreacorinti.github.io/aldusrss/privacy.html` (bozza pronta in `docs/privacy.html`, da pubblicare — vedi nota sull'email di contatto)
- **Data safety** (questionario interattivo): risposta corretta per AldusRSS è "**Nessun dato raccolto o condiviso**" su tutte le categorie (nome, email, posizione, cronologia di navigazione, ecc.) — l'app non ha un server proprio, tutto resta in `localStorage` sul dispositivo. L'unica sfumatura onesta da segnalare (facoltativa, dipende da quanto vuoi essere cauto): quando un feed richiede il proxy CORS di terze parti, il servizio (proxy.cors.sh) vede l'IP del dispositivo e l'URL del feed — non dati "personali" nel senso di Play Console, ma è documentato in privacy.html per trasparenza.
- **Contact details** (obbligatorio, categoria News and Magazines): sito `https://andreacorinti.github.io/aldusrss/` o direttamente `https://andreacorinti.github.io/aldusrss/contact.html` — vedi anche il modulo di dichiarazione News and Magazines più sotto, stesso URL.
- **Content rating**: questionario IARC in Play Console — per un lettore RSS senza contenuti generati dall'app stessa (i contenuti sono quelli delle fonti esterne collegate), la risposta prevista è la fascia più bassa/generica disponibile (probabile "3+" / PEGI 3, tipico per app di pura utilità/notizie).
- **Target audience**: non rivolta specificamente a bambini (è un lettore di notizie generaliste).
- **Ads**: nessuna pubblicità nell'app — dichiaralo.
- **App access**: nessun login richiesto, tutte le funzioni sono accessibili senza restrizioni.

## 4. Store listing

- Nome: `AldusRSS`
- Descrizione breve e completa: bozza in `docs/store/listing-it.md`
- Categoria: Notizie e riviste
- Icona 512×512: `docs/store/ic_play_512.png` (pronta)
- Immagine in evidenza (feature graphic) 1024×500: `docs/store/feature_graphic_1024x500.png` (pronta)
- Screenshot telefono (minimo 2, consigliati 4+): pronti in `docs/store/screenshots/` (emulatore 1080×1920, v0.4.3) — Prima Pagina, Sport, Tecnologia, Cultura, Feed, Modalità notte. Da rifare quando l'app sarà meno "grezza" o cambierà visibilmente; per ora vanno bene per Internal testing.

## 5. Firma

Già pronta (v0.3.x): chiave di release generata e configurata, vedi README sezione "Distribuzione e firma". Al primo caricamento, Play Console offrirà di abilitare **Play App Signing** — consigliato: se in futuro perdi la tua chiave locale, Google ha una procedura di recupero; senza, la perdita è definitiva.

## 6. Package name

`com.andreacorinti.aldusrss` — già impostato, coerente in tutta l'app. Non modificabile dopo il primo caricamento su Play Console.
