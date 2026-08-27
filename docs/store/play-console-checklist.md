# Checklist Play Console — AldusRSS (bozza, non pubblicata)

Non copre la creazione dell'app in Play Console (richiede il tuo login Google) — solo cosa preparare prima e come rispondere ai questionari, per farlo in 10 minuti invece che doverli reinterpretare sul momento.

## 1. Traccia consigliata: Internal testing

Non "Produzione". La traccia **Internal testing** (Rilascio > Test interni) è pensata esattamente per questa fase:
- fino a 100 tester nominati via email (lista che gestisci tu, es. Google Group o lista diretta)
- nessuna revisione dei contenuti da parte di Google, va live in pochi minuti
- l'app resta privata, non compare mai nello store pubblico
- installi comunque *dal vero Play Store* (link diretto ai tester), quindi testi anche il flusso di installazione reale — cosa che un APK laterale non replica del tutto

Quando sarai pronto per un pubblico più ampio, si passa a Closed/Open testing e poi Produzione senza dover rifare la configurazione.

## 2. File da caricare
`android/app/build/outputs/bundle/release/app-release.aab` (rigenerato a ogni release con `npm run android:bundle:release`) — Play Store richiede l'AAB, non l'APK, per i caricamenti.

## 3. App content (obbligatorio anche solo per Internal testing)

- **Privacy Policy URL**: `https://andreacorinti.github.io/aldusrss/privacy.html` (bozza pronta in `docs/privacy.html`, da pubblicare — vedi nota sull'email di contatto)
- **Data safety** (questionario interattivo): risposta corretta per AldusRSS è "**Nessun dato raccolto o condiviso**" su tutte le categorie (nome, email, posizione, cronologia di navigazione, ecc.) — l'app non ha un server proprio, tutto resta in `localStorage` sul dispositivo. L'unica sfumatura onesta da segnalare (facoltativa, dipende da quanto vuoi essere cauto): quando un feed richiede il proxy CORS di terze parti, quei servizi (allorigins.win, corsproxy.io) vedono l'IP del dispositivo e l'URL del feed — non dati "personali" nel senso di Play Console, ma è documentato in privacy.html per trasparenza.
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
- Screenshot telefono (minimo 2, consigliati 4+): da fare — l'emulatore attuale è a bassa risoluzione (320×640), meglio catturarli da un telefono reale o un emulatore a risoluzione più alta quando l'app sarà meno "grezza"

## 5. Firma

Già pronta (v0.3.x): chiave di release generata e configurata, vedi README sezione "Distribuzione e firma". Al primo caricamento, Play Console offrirà di abilitare **Play App Signing** — consigliato: se in futuro perdi la tua chiave locale, Google ha una procedura di recupero; senza, la perdita è definitiva.

## 6. Package name

`com.andreacorinti.aldusrss` — già impostato, coerente in tutta l'app. Non modificabile dopo il primo caricamento su Play Console.
