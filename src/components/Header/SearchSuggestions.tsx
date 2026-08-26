"use client";

import { Link } from "@/i18n/i18n-navigation";
import { useTranslations } from "next-intl";
import { SearchProductSuggestion, SearchBlogSuggestion, SearchPolicySuggestion } from "@/hooks/useSearchSuggestions";
import Cart from "@/components/Icons/Cart";
import BlogIcon from "@/components/Icons/BlogIcon";
import PolicyIcon from "@/components/Icons/PolicyIcon";
import { formatPrice } from "@/lib/format";
import { slugify } from "@/lib/format";

interface SearchSuggestionsProps {
  productSuggestions: SearchProductSuggestion[];
  blogSuggestions: SearchBlogSuggestion[];
  policySuggestions: SearchPolicySuggestion[];
  isLoading: boolean;
  searchQuery: string;
  onSelect: () => void;
  visible: boolean;
}

export default function SearchSuggestions({
  productSuggestions,
  blogSuggestions,
  policySuggestions,
  isLoading,
  searchQuery,
  onSelect,
  visible,
}: SearchSuggestionsProps) {
  const t = useTranslations();

  const totalSuggestions = productSuggestions.length + blogSuggestions.length + policySuggestions.length;

  if (!visible || (searchQuery.trim().length < 2 && totalSuggestions === 0)) {
    return null;
  }

  // Highlight matching text in name/title
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
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[480px] overflow-y-auto">
        {/* Loading skeleton */}
        {isLoading && totalSuggestions === 0 && (
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

        {totalSuggestions > 0 && (
          <>
            {/* Products Section */}
            {productSuggestions.length > 0 && (
              <div className="border-b border-gray-100 last:border-b-0">
                <div className="px-4 py-2 bg-yellow/50 text-xs font-bold text-primary uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cart className="w-3.5 h-3.5 text-primary" />
                    <span>{searchQuery.trim().length < 2 ? "Sản phẩm nổi bật" : t("common.product")} ({productSuggestions.length})</span>
                  </span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {productSuggestions.map((item) => {
                    const categorySlug = item.category
                      ? ((item.category as any).slug || slugify(item.category.title))
                      : "";

                    return (
                      <li key={`prod-${item.id}`}>
                        <Link
                          href={{
                            pathname: "/product/[category]/[slug]",
                            params: {
                              category: categorySlug || String(item.category?.id || ""),
                              slug: item.slug,
                            },
                          }}
                          onClick={onSelect}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-yellow/60 transition-colors duration-150 group"
                        >
                          {/* Product image */}
                          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

                          {/* Price */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-secondary whitespace-nowrap">
                              {(() => {
                                const minCamp = item.min_campaign_price !== undefined && item.min_campaign_price !== null
                                  ? parseFloat(String(item.min_campaign_price))
                                  : null;
                                const camp = item.campaign_price !== undefined && item.campaign_price !== null
                                  ? parseFloat(String(item.campaign_price))
                                  : null;
                                const base = parseFloat(String(item.min_price || item.price || 0)) || 0;
                                const effectivePrice = (minCamp !== null && minCamp > 0 && minCamp < base)
                                  ? minCamp
                                  : (camp !== null && camp > 0 && camp < base)
                                    ? camp
                                    : base;
                                return formatPrice(effectivePrice);
                              })()}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Blogs Section */}
            {blogSuggestions.length > 0 && (
              <div className="border-b border-gray-100 last:border-b-0">
                <div className="px-4 py-2 bg-yellow/50 text-xs font-bold text-primary uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BlogIcon className="w-3.5 h-3.5 text-primary" />
                    <span>{searchQuery.trim().length < 2 ? "Bài viết mới nhất" : t("common.blog")} ({blogSuggestions.length})</span>
                  </span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {blogSuggestions.map((item) => {
                    const categorySlug = item.category
                      ? (item.category.slug || slugify(item.category.title))
                      : "tin-tuc";

                    return (
                      <li key={`blog-${item.id}`}>
                        <Link
                          href={{
                            pathname: "/blog/category/[category]/[slug]",
                            params: {
                              category: categorySlug,
                              slug: item.slug,
                            },
                          }}
                          onClick={onSelect}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-yellow/60 transition-colors duration-150 group"
                        >
                          {/* Blog thumbnail */}
                          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Blog info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate leading-tight">
                              {highlightMatch(item.title, searchQuery)}
                            </div>
                            {item.category && (
                              <div className="text-xs text-secondary mt-0.5 truncate font-medium">
                                {item.category.title}
                              </div>
                            )}
                          </div>

                          {/* Tag badge */}
                          <div className="text-right flex-shrink-0">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                              {t("common.blog")}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Policies Section */}
            {policySuggestions.length > 0 && (
              <div className="border-b border-gray-100 last:border-b-0">
                <div className="px-4 py-2 bg-yellow/50 text-xs font-bold text-primary uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <PolicyIcon className="w-3.5 h-3.5 text-primary" />
                    <span>{searchQuery.trim().length < 2 ? "Chính sách quy định" : t("common.policy")} ({policySuggestions.length})</span>
                  </span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {policySuggestions.map((item) => (
                    <li key={`policy-${item.id}`}>
                      <Link
                        href={{
                          pathname: "/policy/[slug]",
                          params: {
                            slug: item.slug,
                          },
                        }}
                        onClick={onSelect}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-yellow/60 transition-colors duration-150 group"
                      >
                        {/* Policy Icon */}
                        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-yellow/80 border border-secondary/20 flex items-center justify-center text-primary">
                          <PolicyIcon className="w-5 h-5" />
                        </div>

                        {/* Policy info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate leading-tight">
                            {highlightMatch(item.title, searchQuery)}
                          </div>
                        </div>

                        {/* Tag badge */}
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow/80 text-primary border border-secondary/20 font-medium">
                            {t("common.policy")}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* View all link */}
            <div className="border-t border-gray-100 bg-gray-50/50">
              <Link
                href={{
                  pathname: "/search",
                  query: { q: searchQuery.trim() },
                } as any}
                onClick={onSelect}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary hover:bg-yellow/60 transition-colors duration-150"
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
        {!isLoading && totalSuggestions === 0 && searchQuery.trim().length >= 2 && (
          <div className="px-4 py-6 text-center">
            <div className="text-sm text-gray-500">{t("common.no_products_found")}</div>
            <div className="text-xs text-gray-400 mt-1">{t("search.try_different_keyword")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
