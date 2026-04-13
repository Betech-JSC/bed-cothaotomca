"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type AlternateParams = Record<string, Record<string, string>>;

interface AlternativeSlugContextProps {
  alternativeParams: AlternateParams;
  setAlternativeParams: (params: AlternateParams) => void;
}

const AlternativeSlugContext = createContext<AlternativeSlugContextProps>({
  alternativeParams: {},
  setAlternativeParams: () => {},
});

export const useAlternativeSlug = () => useContext(AlternativeSlugContext);

export const AlternativeSlugProvider = ({ children }: { children: ReactNode }) => {
  const [alternativeParams, setAlternativeParams] = useState<AlternateParams>({});

  return (
    <AlternativeSlugContext.Provider value={{ alternativeParams, setAlternativeParams }}>
      {children}
    </AlternativeSlugContext.Provider>
  );
};
