"use client";

import { useEffect } from "react";
import { useAlternateLinks, AlternateLinksMap, AlternateLinkInfo } from "@/contexts/AlternateLinksContext";

function normalizeLinkEntry(entry: string | AlternateLinkInfo | undefined): AlternateLinkInfo | undefined {
  if (!entry) return undefined;
  if (typeof entry !== "string") return entry;
  const cleaned = entry.replace(/^\/(vi|en)(?=\/)/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if ((parts[0] === "san-pham" || parts[0] === "product") && parts.length === 2) {
    return {
      category: parts[1],
      pathname: "/product/[category]",
      params: { category: parts[1] },
    };
  }
  if ((parts[0] === "san-pham" || parts[0] === "product") && parts.length === 3) {
    return {
      category: parts[1],
      slug: parts[2],
      pathname: "/product/[category]/[slug]",
      params: { category: parts[1], slug: parts[2] },
    };
  }
  if ((parts[0] === "chinh-sach" || parts[0] === "policy") && parts.length === 2) {
    return {
      slug: parts[1],
      pathname: "/policy/[slug]",
      params: { slug: parts[1] },
    };
  }
  if (parts[0] === "tin-tuc" && parts.length === 3) {
    return {
      category: parts[1],
      slug: parts[2],
      pathname: "/blog/category/[category]/[slug]",
      params: { category: parts[1], slug: parts[2] },
    };
  }
  if (parts[0] === "blog" && parts[1] === "category" && parts.length === 4) {
    return {
      category: parts[2],
      slug: parts[3],
      pathname: "/blog/category/[category]/[slug]",
      params: { category: parts[2], slug: parts[3] },
    };
  }
  return { pathname: cleaned };
}

export default function AlternateLinksUpdater({
  links,
  alternateLinks,
  alternates,
}: {
  links?: AlternateLinksMap | Record<string, any>;
  alternateLinks?: AlternateLinksMap | Record<string, any>;
  alternates?: AlternateLinksMap | Record<string, any>;
}) {
  const { setAlternateLinks } = useAlternateLinks();
  const raw = links || alternateLinks || alternates;

  useEffect(() => {
    if (!raw) return;
    const normalized: AlternateLinksMap = {
      ...(raw.vi ? { vi: normalizeLinkEntry(raw.vi) } : {}),
      ...(raw.en ? { en: normalizeLinkEntry(raw.en) } : {}),
    };
    setAlternateLinks(normalized);
    return () => {
      setAlternateLinks({});
    };
  }, [raw, setAlternateLinks]);

  return null;
}
