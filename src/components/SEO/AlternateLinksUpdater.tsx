"use client";

import { useEffect } from "react";
import { useAlternateLinks, AlternateLinksMap } from "@/contexts/AlternateLinksContext";

export default function AlternateLinksUpdater({ links }: { links: AlternateLinksMap }) {
  const { setAlternateLinks } = useAlternateLinks();

  useEffect(() => {
    setAlternateLinks(links);
    return () => {
      setAlternateLinks({});
    };
  }, [links, setAlternateLinks]);

  return null;
}
