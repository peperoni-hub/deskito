// Languages: every text in Deskito goes through t("English text"), which returns the
// translation for the chosen language (or the English text if there's no translation).
// The translations themselves live in the lang/ folder, one file per language.

const LANGUAGES = {
  en: { name: "English", locale: "en" },
  // Browsers have no Bosnian date names; Serbian Latin (Bosnia) gives the same words: "srijeda, 14. oktobar"
  bs: { name: "Bosanski", locale: "sr-Latn-BA" },
  hr: { name: "Hrvatski", locale: "hr-HR" },
  sr: { name: "Српски", locale: "sr-Cyrl-RS" },
  tr: { name: "Türkçe", locale: "tr-TR" },
  de: { name: "Deutsch", locale: "de-DE" },
  fr: { name: "Français", locale: "fr-FR" },
  it: { name: "Italiano", locale: "it-IT" },
  zh: { name: "中文", locale: "zh-CN" },
  ja: { name: "日本語", locale: "ja-JP" },
  ko: { name: "한국어", locale: "ko-KR" },
  ar: { name: "العربية", locale: "ar-u-ca-gregory-nu-latn", rtl: true },
};

// Each lang/xx.js file adds its texts here: TRANSLATIONS.xx = { texts: {...}, words: {...} }
const TRANSLATIONS = {};

function pickLanguage() {
  try {
    const saved = localStorage.getItem("language");
    if (saved && LANGUAGES[saved]) return saved;
  } catch {
    // No saved language
  }
  // First visit: use the device's language if Deskito has it
  for (const wanted of navigator.languages || [navigator.language]) {
    const code = (wanted || "").toLowerCase().split("-")[0];
    if (LANGUAGES[code]) return code;
  }
  return "en";
}

const currentLanguage = pickLanguage();

function locale() {
  return LANGUAGES[currentLanguage].locale;
}

function t(text, values = {}) {
  const translated = TRANSLATIONS[currentLanguage]?.texts?.[text] ?? text;
  return translated.replace(/\{(\w+)\}/g, (match, name) => (name in values ? values[name] : match));
}

function setLanguage(code) {
  localStorage.setItem("language", code);
  location.reload();
}

// Translate all the fixed texts written in index.html (buttons, labels, placeholders...)
function translatePage() {
  if (currentLanguage === "en") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.parentElement.closest("script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (!text) continue;
    const translated = t(text);
    if (translated !== text) {
      node.textContent = node.textContent.replace(text, translated);
    }
  }
  for (const attribute of ["placeholder", "title", "alt"]) {
    for (const element of document.querySelectorAll(`[${attribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(attribute)));
    }
  }
  // Suggestions for "Other" plans have their own entries ("label:Date" is a romantic date,
  // not a calendar date)
  for (const option of document.querySelectorAll("datalist option")) {
    const key = `label:${option.value}`;
    const translated = t(key);
    if (translated !== key) option.value = translated;
  }
}

// Set the page language and writing direction straight away (Arabic is right-to-left)
document.documentElement.lang = currentLanguage;
document.documentElement.dir = LANGUAGES[currentLanguage].rtl ? "rtl" : "ltr";

// The language pickers in Settings and on the welcome screen
function fillLanguageSelects() {
  for (const select of document.querySelectorAll(".language-select")) {
    select.replaceChildren(
      ...Object.entries(LANGUAGES).map(([code, language]) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = language.name;
        return option;
      })
    );
    select.value = currentLanguage;
    select.addEventListener("change", () => setLanguage(select.value));
  }
}
