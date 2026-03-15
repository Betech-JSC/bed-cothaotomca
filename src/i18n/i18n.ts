import en from "./locales/en.json";
import vi from "./locales/vi.json";

export const LOCALES = ["en", "vi"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = {
  en,
  vi,
};

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries.en;
}

