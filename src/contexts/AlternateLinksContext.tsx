"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface AlternateLinkInfo {
  category?: string;
  slug?: string;
  pathname?: string;
  params?: Record<string, string>;
}

export type AlternateLinksMap = Partial<Record<"vi" | "en", AlternateLinkInfo>>;

export interface AlternateLinksContextType {
  alternateLinks: AlternateLinksMap;
  setAlternateLinks: (links: AlternateLinksMap) => void;
}

export const AlternateLinksContext = createContext<AlternateLinksContextType>({
  alternateLinks: {},
  setAlternateLinks: () => {},
});

export function AlternateLinksProvider({ children }: { children: ReactNode }) {
  const [alternateLinks, setAlternateLinks] = useState<AlternateLinksMap>({});

  return (
    <AlternateLinksContext.Provider value={{ alternateLinks, setAlternateLinks }}>
      {children}
    </AlternateLinksContext.Provider>
  );
}

export function useAlternateLinks(): AlternateLinksContextType {
  return useContext(AlternateLinksContext);
}
