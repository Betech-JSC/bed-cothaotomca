"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LOCALE, type Locale, getMessages } from "./i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof getMessages>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

const STORAGE_KEY = "locale";

export function I18nProvider({ children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("lang") as Locale | null;
    const fromStorage = (window.localStorage.getItem(STORAGE_KEY) ??
      undefined) as Locale | undefined;

    if (fromQuery === "en" || fromQuery === "vi") {
      setLocaleState(fromQuery);
      window.localStorage.setItem(STORAGE_KEY, fromQuery);
      return;
    }

    if (fromStorage === "en" || fromStorage === "vi") {
      setLocaleState(fromStorage);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: getMessages(locale),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

