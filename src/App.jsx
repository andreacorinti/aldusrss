import React, { useState } from "react";
import { Menu, Rss, Newspaper, Settings2, ArrowLeft, Clock, Check } from "lucide-react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,900;1,9..144,500;1,9..144,700&family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap');
`;

const SOURCES = {
  cronaca: {
    id: "cronaca",
    name: "La Cronaca",
    tagline: "Quotidiano indipendente",
    accent: "#A31E22",
    paper: "#EFE9DC",
    ink: "#211D19",
    mastheadStyle: { fontFamily: "'Fraunces', serif", fontWeight: 900, letterSpacing: "0.02em", textTransform: "uppercase" },
    headlineStyle: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
    hero: {
      image: "https://picsum.photos/seed/cronaca-hero/900/650",
      kicker: "PRIMO PIANO",
      title: "Manovra 2027, accordo raggiunto in nottata tra i partiti di maggioranza",
      dek: "Il testo passa ora al vaglio delle commissioni. Previsto il voto finale entro venerdì.",
      author: "Elena Ferraris",
      time: "8 min fa",
      body: "Dopo oltre dieci ore di trattativa, i capigruppo hanno trovato la quadra sui punti più contestati della legge di bilancio. Resta da sciogliere il nodo delle coperture per il taglio del cuneo fiscale, che verrà affrontato nelle prossime ore dal Ministero dell'Economia.\n\nLe opposizioni annunciano battaglia in aula, ma la tenuta della maggioranza non sembra al momento a rischio. Il testo dovrà comunque tornare in commissione per gli emendamenti tecnici prima dell'approdo in Assemblea.",
    },
    secondary: [
      { image: "https://picsum.photos/seed/cronaca-2/500/400", kicker: "TRASPORTI", title: "Sciopero dei trasporti confermato per giovedì" },
      { image: "https://picsum.photos/seed/cronaca-3/500/400", kicker: "LAVORO", title: "Nuovo decreto sul lavoro: cosa cambia da ottobre" },
      { image: "https://picsum.photos/seed/cronaca-4/500/400", kicker: "CRONACA", title: "Alluvione in Emilia, salgono a tre i comuni isolati" },
    ],
    brief: [
      { title: "Borsa di Milano chiude in rialzo dello 0,8%", tag: "Economia" },
      { title: "Vertice UE su energia rinviato a settembre", tag: "Estero" },
      { title: "Roma, riapre la biblioteca Angelica dopo i lavori", tag: "Cultura" },
      { title: "Meteo, weekend instabile al Nord", tag: "Meteo" },
    ],
  },
  pixel: {
    id: "pixel",
    name: "Pixel & Bit",
    tagline: "Tecnologia, ogni giorno",
    accent: "#2E6F6A",
    paper: "#F1EFE6",
    ink: "#1B211F",
    mastheadStyle: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.01em" },
    headlineStyle: { fontFamily: "'Fraunces', serif", fontWeight: 600 },
    hero: {
      image: "https://picsum.photos/seed/pixel-hero/900/650",
      kicker: "RECENSIONE",
      title: "Abbiamo provato il nuovo visore leggero: la realtà mista è (quasi) pronta",
      dek: "Otto ore di autonomia, peso dimezzato rispetto al modello precedente. Ma il software è ancora acerbo.",
      author: "Marco Villa",
      time: "23 min fa",
      body: "Il salto generazionale si sente soprattutto indossando il visore: 210 grammi contro i 380 del modello uscito due anni fa. Il comfort ne guadagna, e con esso la voglia di tenerlo addosso più a lungo.\n\nSul fronte software, però, il catalogo di applicazioni ottimizzate resta limitato. Le funzioni di realtà mista funzionano bene in ambienti ben illuminati, meno in condizioni di luce scarsa.",
    },
    secondary: [
      { image: "https://picsum.photos/seed/pixel-2/500/400", kicker: "TECNOLOGIA", title: "Le batterie a stato solido arrivano nel 2028, secondo un report" },
      { image: "https://picsum.photos/seed/pixel-3/500/400", kicker: "SICUREZZA", title: "Un bug diffuso mette a rischio migliaia di router domestici" },
      { image: "https://picsum.photos/seed/pixel-4/500/400", kicker: "SOFTWARE", title: "Il codice del vecchio browser diventa open source" },
    ],
    brief: [
      { title: "Aggiornamento critico per il sistema operativo mobile", tag: "Update" },
      { title: "Startup italiana chiude un round da 12 milioni", tag: "Startup" },
      { title: "Il prezzo dei chip di memoria torna a salire", tag: "Mercato" },
      { title: "Nuove regole UE sull'IA in vigore da ottobre", tag: "Normativa" },
    ],
  },
  sport: {
    id: "sport",
    name: "Campo Aperto",
    tagline: "Tutto lo sport, minuto per minuto",
    accent: "#C97A2B",
    paper: "#F2EADC",
    ink: "#221C15",
    mastheadStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase" },
    headlineStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 },
    hero: {
      image: "https://picsum.photos/seed/sport-hero/900/650",
      kicker: "SERIE A",
      title: "Rimonta nel finale: la capolista non si ferma più",
      dek: "Doppietta nella ripresa dopo essere andati sotto di due gol. Settima vittoria consecutiva.",
      author: "Redazione Sport",
      time: "1 ora fa",
      body: "Sotto di due reti al quarantacinquesimo, la squadra ha ribaltato il risultato con due gol nel giro di dieci minuti nella ripresa, trascinata da un attaccante in stato di grazia.\n\nCon questo risultato la classifica si allunga in vetta, con un margine di quattro punti sulla seconda in classifica a otto giornate dal termine.",
    },
    secondary: [
      { image: "https://picsum.photos/seed/sport-2/500/400", kicker: "MERCATO", title: "Calciomercato, si complica la trattativa per l'attaccante" },
      { image: "https://picsum.photos/seed/sport-3/500/400", kicker: "SALUTE", title: "Infortunio in nazionale, out per un mese" },
      { image: "https://picsum.photos/seed/sport-4/500/400", kicker: "MOTORI", title: "Formula 1, pole position all'ultimo tentativo" },
    ],
    brief: [
      { title: "Basket, la nazionale vola in semifinale", tag: "Basket" },
      { title: "Tennis, avanti agli ottavi anche il numero due del seeding", tag: "Tennis" },
      { title: "Ciclismo, tappa di montagna decisiva domani", tag: "Ciclismo" },
      { title: "Volley, derby di cartello sabato sera", tag: "Volley" },
    ],
  },
};

function StatusBar({ ink }) {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[11px] font-medium" style={{ color: ink }}>
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-2 border rounded-[1px]" style={{ borderColor: ink }} />
      </span>
    </div>
  );
}

function Masthead({ src, onMenu }) {
  return (
    <div className="px-5 pt-2 pb-3">
      <div className="flex items-center justify-between">
        <button onClick={onMenu} className="p-1 -ml-1">
          <Menu size={20} style={{ color: src.ink }} />
        </button>
        <div className="text-center flex-1" style={{ ...src.mastheadStyle, color: src.ink, fontSize: "22px", lineHeight: 1 }}>
          {src.name}
        </div>
        <div className="w-7" />
      </div>
      <div className="flex items-center justify-center gap-2 mt-1.5">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: src.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
          mercoledì 26 agosto · {src.tagline}
        </span>
      </div>
      <div className="mt-2 h-[2px]" style={{ backgroundColor: src.accent }} />
    </div>
  );
}

function Kicker({ text, accent }) {
  return (
    <span
      className="inline-block text-[10px] font-bold tracking-widest uppercase px-0"
      style={{ color: accent, fontFamily: "'Inter', sans-serif" }}
    >
      {text}
    </span>
  );
}

function FrontPage({ src, onOpenArticle }) {
  return (
    <div className="px-5 pb-6">
      {/* Hero */}
      <button className="block w-full text-left" onClick={onOpenArticle}>
        <img src={src.hero.image} alt="" className="w-full aspect-[4/3] object-cover" />
        <div className="mt-3">
          <Kicker text={src.hero.kicker} accent={src.accent} />
          <h1
            className="mt-1"
            style={{ ...src.headlineStyle, color: src.ink, fontSize: "28px", lineHeight: 1.08 }}
          >
            {src.hero.title}
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: src.ink, opacity: 0.75, fontFamily: "'Inter', sans-serif" }}>
            {src.hero.dek}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: src.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
            <span>{src.hero.author}</span>
            <span>·</span>
            <Clock size={11} />
            <span>{src.hero.time}</span>
          </div>
        </div>
      </button>

      <div className="mt-5 h-px" style={{ backgroundColor: src.ink, opacity: 0.15 }} />

      {/* Secondary grid */}
      <div className="grid grid-cols-2 gap-4 mt-5">
        {src.secondary.map((item, i) => (
          <div key={i}>
            <img src={item.image} alt="" className="w-full aspect-[5/4] object-cover" />
            <Kicker text={item.kicker} accent={src.accent} />
            <h3 className="mt-1" style={{ ...src.headlineStyle, color: src.ink, fontSize: "15px", lineHeight: 1.15 }}>
              {item.title}
            </h3>
          </div>
        ))}
      </div>

      <div className="mt-5 h-px" style={{ backgroundColor: src.ink, opacity: 0.15 }} />

      {/* Brief list */}
      <div className="mt-5">
        <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: src.ink, fontFamily: "'Inter', sans-serif" }}>
          In breve
        </span>
        <div className="mt-2 divide-y" style={{ borderColor: `${src.ink}22` }}>
          {src.brief.map((item, i) => (
            <div key={i} className="py-2.5 flex items-start gap-2" style={{ borderTopWidth: i === 0 ? 0 : "1px", borderColor: `${src.ink}1F` }}>
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: src.accent }} />
              <div>
                <p className="text-[13.5px]" style={{ color: src.ink, fontFamily: "'Inter', sans-serif" }}>{item.title}</p>
                <span className="text-[10.5px] uppercase tracking-wide" style={{ color: src.ink, opacity: 0.5, fontFamily: "'Inter', sans-serif" }}>{item.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArticleView({ src, onBack }) {
  return (
    <div className="px-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 py-3 text-[13px]" style={{ color: src.ink, fontFamily: "'Inter', sans-serif" }}>
        <ArrowLeft size={16} />
        Prima pagina
      </button>
      <img src={src.hero.image} alt="" className="w-full aspect-[4/3] object-cover" />
      <Kicker text={src.hero.kicker} accent={src.accent} />
      <h1 className="mt-2" style={{ ...src.headlineStyle, color: src.ink, fontSize: "26px", lineHeight: 1.1 }}>
        {src.hero.title}
      </h1>
      <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: src.ink, opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
        <span>{src.hero.author}</span>
        <span>·</span>
        <Clock size={11} />
        <span>{src.hero.time}</span>
      </div>
      <div className="mt-4 space-y-3">
        {src.hero.body.split("\n\n").map((p, i) => (
          <p key={i} className="text-[15px] leading-relaxed" style={{ color: src.ink, opacity: 0.88, fontFamily: "'Inter', sans-serif" }}>
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

function FeedsScreen({ ink }) {
  const [enabled, setEnabled] = useState({ cronaca: true, pixel: true, sport: false });
  return (
    <div className="px-5 pt-4 pb-8">
      <h2 className="text-[20px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: "#211D19" }}>I tuoi feed</h2>
      <p className="text-[12.5px] mt-1 mb-4" style={{ color: "#211D19", opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
        Ogni fonte mantiene la propria impaginazione automatica.
      </p>
      <div className="space-y-2.5">
        {Object.values(SOURCES).map((s) => (
          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#FFFFFFAA", border: "1px solid #21201C1A" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center text-[13px] font-bold" style={{ backgroundColor: `${s.accent}22`, color: s.accent, fontFamily: "'Fraunces', serif" }}>
                {s.name[0]}
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: "#211D19", fontFamily: "'Inter', sans-serif" }}>{s.name}</p>
                <p className="text-[11.5px]" style={{ color: "#211D19", opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>{s.tagline}</p>
              </div>
            </div>
            <button
              onClick={() => setEnabled((e) => ({ ...e, [s.id]: !e[s.id] }))}
              className="w-9 h-5 rounded-full relative transition-colors"
              style={{ backgroundColor: enabled[s.id] ? s.accent : "#21201C33" }}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: enabled[s.id] ? "18px" : "2px" }} />
            </button>
          </div>
        ))}
        <button className="w-full mt-1 py-3 rounded-lg text-[13px] font-medium border border-dashed" style={{ color: "#211D19AA", borderColor: "#21201C33", fontFamily: "'Inter', sans-serif" }}>
          + Aggiungi un feed RSS
        </button>
      </div>
    </div>
  );
}

function SettingsScreen() {
  const [autoLayout, setAutoLayout] = useState(true);
  return (
    <div className="px-5 pt-4 pb-8">
      <h2 className="text-[20px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, color: "#211D19" }}>Impostazioni</h2>
      <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "#FFFFFFAA", border: "1px solid #21201C1A" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium" style={{ color: "#211D19", fontFamily: "'Inter', sans-serif" }}>Layout automatico per fonte</p>
            <p className="text-[12px] mt-0.5" style={{ color: "#211D19", opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>Sceglie font, colore e griglia in base al feed</p>
          </div>
          <button
            onClick={() => setAutoLayout((v) => !v)}
            className="w-9 h-5 rounded-full relative shrink-0"
            style={{ backgroundColor: autoLayout ? "#2E6F6A" : "#21201C33" }}
          >
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: autoLayout ? "18px" : "2px" }} />
          </button>
        </div>
      </div>
      <div className="mt-3 p-4 rounded-lg space-y-2" style={{ backgroundColor: "#FFFFFFAA", border: "1px solid #21201C1A" }}>
        <p className="text-[14px] font-medium" style={{ color: "#211D19", fontFamily: "'Inter', sans-serif" }}>Modello di riferimento</p>
        {["Quotidiano", "Magazine", "Sportivo"].map((t, i) => (
          <div key={t} className="flex items-center gap-2 text-[13px]" style={{ color: "#211D19", fontFamily: "'Inter', sans-serif" }}>
            {i === 0 ? <Check size={14} color="#2E6F6A" /> : <span className="w-3.5" />}
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("front");
  const [sourceId, setSourceId] = useState("cronaca");
  const [article, setArticle] = useState(false);
  const src = SOURCES[sourceId];

  return (
    <div className="min-h-screen flex items-center justify-center py-8" style={{ backgroundColor: "#DDD8CB", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS}</style>
      <div
        className="w-[375px] h-[780px] rounded-[36px] overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: src.paper, border: "8px solid #16140F" }}
      >
        <StatusBar ink={src.ink} />

        {tab === "front" && !article && (
          <>
            <Masthead src={src} onMenu={() => {}} />
            <div className="px-5 flex gap-2 pb-3">
              {Object.values(SOURCES).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSourceId(s.id)}
                  className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-wide transition-colors"
                  style={{
                    backgroundColor: sourceId === s.id ? s.accent : "transparent",
                    color: sourceId === s.id ? "#fff" : src.ink,
                    opacity: sourceId === s.id ? 1 : 0.5,
                    border: `1px solid ${sourceId === s.id ? s.accent : `${src.ink}33`}`,
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <FrontPage src={src} onOpenArticle={() => setArticle(true)} />
            </div>
          </>
        )}

        {tab === "front" && article && (
          <div className="flex-1 overflow-y-auto">
            <ArticleView src={src} onBack={() => setArticle(false)} />
          </div>
        )}

        {tab === "feeds" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#EDE8DC" }}>
            <FeedsScreen ink={src.ink} />
          </div>
        )}

        {tab === "settings" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#EDE8DC" }}>
            <SettingsScreen />
          </div>
        )}

        {/* Bottom nav */}
        <div className="flex items-center justify-around py-3 border-t" style={{ borderColor: "#00000014", backgroundColor: "#FBF9F3" }}>
          {[
            { id: "front", label: "Prima pagina", icon: Newspaper },
            { id: "feeds", label: "Feed", icon: Rss },
            { id: "settings", label: "Impostazioni", icon: Settings2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setArticle(false);
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <Icon size={19} color={tab === id ? "#211D19" : "#211D1966"} />
              <span className="text-[9.5px]" style={{ color: tab === id ? "#211D19" : "#211D1966" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
