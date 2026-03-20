"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { locales, defaultLocale, type Locale } from "./config";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

const STORAGE_KEY = "locale";

export function I18nProvider({ children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("lang") as Locale | null;
    const fromStorage = window.localStorage.getItem(STORAGE_KEY) as Locale | null;

    if (fromQuery && locales.includes(fromQuery)) {
      setLocaleState(fromQuery);
      window.localStorage.setItem(STORAGE_KEY, fromQuery);
      return;
    }

    if (fromStorage && locales.includes(fromStorage)) {
      setLocaleState(fromStorage);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (!locales.includes(next)) return;

    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
