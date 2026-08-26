export const DEFAULT_TEMPLATE_ID = "quotidiano";

export const TEMPLATES = {
  quotidiano: {
    id: "quotidiano",
    label: "Quotidiano",
    paper: "#EFE9DC",
    ink: "#211D19",
    accent: "#A31E22",
    mastheadStyle: { fontFamily: "'Fraunces', serif", fontWeight: 900, letterSpacing: "0.02em", textTransform: "uppercase" },
    headlineStyle: { fontFamily: "'Fraunces', serif", fontWeight: 700 },
  },
  magazine: {
    id: "magazine",
    label: "Magazine",
    paper: "#F1EFE6",
    ink: "#1B211F",
    accent: "#2E6F6A",
    mastheadStyle: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.01em" },
    headlineStyle: { fontFamily: "'Fraunces', serif", fontWeight: 600 },
  },
  sportivo: {
    id: "sportivo",
    label: "Sportivo",
    paper: "#F2EADC",
    ink: "#221C15",
    accent: "#C97A2B",
    mastheadStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase" },
    headlineStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 },
  },
  rivista: {
    id: "rivista",
    label: "Rivista",
    paper: "#F0E6DE",
    ink: "#2A1E1B",
    accent: "#8B3F6B",
    mastheadStyle: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 400, letterSpacing: "0.01em" },
    headlineStyle: { fontFamily: "'Fraunces', serif", fontWeight: 500, fontStyle: "italic" },
  },
};
