export const DEFAULT_TEMPLATE_ID = "quotidiano";

// Ogni template porta anche una variante "dark": stessa famiglia cromatica,
// luminosità invertita, accento schiarito per restare leggibile su sfondo scuro.
export const TEMPLATES = {
  quotidiano: {
    id: "quotidiano",
    label: "Quotidiano",
    paper: "#EFE9DC",
    ink: "#211D19",
    accent: "#A31E22",
    mastheadStyle: { fontFamily: "'Fraunces', serif", fontWeight: 900, letterSpacing: "0.02em", textTransform: "uppercase" },
    headlineStyle: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
    dark: { paper: "#1E1A16", ink: "#EDE6D8", accent: "#E2545A" },
  },
  magazine: {
    id: "magazine",
    label: "Magazine",
    paper: "#F1EFE6",
    ink: "#1B211F",
    accent: "#2E6F6A",
    mastheadStyle: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.01em" },
    headlineStyle: { fontFamily: "'Fraunces', serif", fontWeight: 600 },
    dark: { paper: "#171E1C", ink: "#E7EFEC", accent: "#5FBDB3" },
  },
  sportivo: {
    id: "sportivo",
    label: "Sportivo",
    paper: "#F2EADC",
    ink: "#221C15",
    accent: "#C97A2B",
    mastheadStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase" },
    headlineStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 },
    dark: { paper: "#201A12", ink: "#F0E6D8", accent: "#E8A257" },
  },
  rivista: {
    id: "rivista",
    label: "Rivista",
    paper: "#F0E6DE",
    ink: "#2A1E1B",
    accent: "#8B3F6B",
    mastheadStyle: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 400, letterSpacing: "0.01em" },
    headlineStyle: { fontFamily: "'Fraunces', serif", fontWeight: 500, fontStyle: "italic" },
    dark: { paper: "#201A1D", ink: "#EEE3DC", accent: "#C97AA8" },
  },
};
