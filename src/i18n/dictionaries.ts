import type { Locale } from "./config";

type Messages = {
  homeTitle: string;
  homeDescription: string;
  language: string;
};

const en: Messages = {
  homeTitle: "Free Next.js Template for Startup and SaaS",
  homeDescription: "This is Home for Startup Nextjs Template",
  language: "Language",
};

const vi: Messages = {
  homeTitle: "Template Next.js miễn phí cho Startup và SaaS",
  homeDescription: "Đây là trang chủ cho Startup Nextjs Template",
  language: "Ngôn ngữ",
};

const dictionaries: Record<Locale, Messages> = {
  en,
  vi,
};

export function getMessages(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}
