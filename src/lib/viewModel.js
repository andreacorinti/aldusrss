import { stripHtml, relativeTime } from "./format";
import { SECTIONS, FRONT_PAGE_ID } from "./sections";
import { DEFAULT_TEMPLATE_ID } from "./templates";

export function mapArticle(a, lang) {
  return {
    ...a,
    kicker: (a.sourceName || "").toUpperCase(),
    dek: stripHtml(a.description).slice(0, 180),
    time: relativeTime(a.pubDate, lang),
  };
}

export function buildSectionMeta(id) {
  if (id === FRONT_PAGE_ID) return { id: FRONT_PAGE_ID, labelKey: "frontPage", templateId: DEFAULT_TEMPLATE_ID };
  const section = SECTIONS[id];
  return section ? { id, labelKey: `section.${id}`, templateId: section.templateId } : { id, labelKey: id, templateId: DEFAULT_TEMPLATE_ID };
}

export function resolveTemplate(template, dark) {
  if (!dark || !template.dark) return template;
  return { ...template, ...template.dark };
}

// Colori dell'interfaccia (non del "foglio" editoriale, che viene da templates.js):
// masthead della schermata Feed/Impostazioni, card, toggle, sfondo del telefono.
export const CHROME_LIGHT = {
  pageBg: "#DDD8CB",
  bezel: "#16140F",
  screenBg: "#EDE8DC",
  ink: "#211D19",
  card: "#FFFFFFAA",
  cardBorder: "#21201C1A",
  divider: "#21201C33",
  chipBg: "#21201C14",
  navBg: "#FBF9F3",
  navBorder: "#00000014",
  success: "#2E6F6A",
  warning: "#C97A2B",
  danger: "#A31E22",
};

export const CHROME_DARK = {
  pageBg: "#0C0B09",
  bezel: "#3A3630",
  screenBg: "#1C1815",
  ink: "#EDE6D8",
  card: "#FFFFFF12",
  cardBorder: "#FFFFFF1F",
  divider: "#FFFFFF2E",
  chipBg: "#FFFFFF1A",
  navBg: "#15120F",
  navBorder: "#FFFFFF14",
  success: "#4FA79E",
  warning: "#D89355",
  danger: "#E5636A",
};
