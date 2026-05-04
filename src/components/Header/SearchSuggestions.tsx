"use client";

import { useRef, useEffect } from "react";
import { Link } from "@/i18n/i18n-navigation";
import { useTranslations } from "next-intl";
import { SearchSuggestion } from "@/hooks/useSearchSuggestions";
import { formatPrice } from "@/lib/format";
import { slugify } from "@/lib/format";

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  searchQuery: string;
  onSelect: () => void;
  visible: boolean;
}

export default function SearchSuggestions({
  suggestions,
  isLoading,
  searchQuery,
  onSelect,
  visible,
}: SearchSuggestionsProps) {
  const t = useTranslations();

  if (!visible || (searchQuery.trim().length < 2 && suggestions.length === 0)) {
    return null;
  }

  // Highlight matching text in product name
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <strong key={i} className="text-secondary font-bold">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[420px] overflow-y-auto">
        {/* Loading skeleton */}
        {isLoading && suggestions.length === 0 && (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Suggestions list */}
        {suggestions.length > 0 && (
          <>
            <ul className="py-1">
              {suggestions.map((item, index) => {
                const categorySlug = item.category
                  ? slugify(item.category.title)
                  : "";

                return (
                  <li key={item.id}>
                    <Link
                      href={{
                        pathname: "/product/[category]/[slug]",
                        params: {
                          category: categorySlug || String(item.category?.id || ""),
                          slug: item.slug,
                        },
                      }}
                      onClick={onSelect}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50/80 transition-colors duration-150 group"
                    >
                      {/* Product image */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate leading-tight">
                          {highlightMatch(item.name, searchQuery)}
                        </div>
                        {item.category && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {item.category.title}
                          </div>
                        )}
                      </div>

                      {/* Price - "chỉ từ" format */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-[11px] text-gray-500 leading-none">{t("common.only_from")}</div>
                        <div className="text-sm font-semibold text-secondary whitespace-nowrap">
                          {formatPrice(parseFloat(String(item.min_price || item.price)) || 0)}
                        </div>
                      </div>
                    </Link>
                    {index < suggestions.length - 1 && (
                      <div className="mx-4 border-b border-gray-50" />
                    )}
                  </li>
                );
              })}
            </ul>

            {/* View all link */}
            <div className="border-t border-gray-100">
              <Link
                href={{
                  pathname: "/search",
                  query: { q: searchQuery.trim() },
                } as any}
                onClick={onSelect}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary hover:bg-amber-50/60 transition-colors duration-150"
              >
                <span>
                  {t("search.view_all_results")} &ldquo;{searchQuery.trim()}&rdquo;
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </>
        )}

        {/* No results */}
        {!isLoading && suggestions.length === 0 && searchQuery.trim().length >= 2 && (
          <div className="px-4 py-6 text-center">
            <div className="text-sm text-gray-500">{t("common.no_products_found")}</div>
            <div className="text-xs text-gray-400 mt-1">{t("search.try_different_keyword")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
