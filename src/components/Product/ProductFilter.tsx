"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import AnimateOnScroll from "../Animated/animated-appear";

function CustomCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="group flex w-full cursor-pointer items-center gap-2 py-2 transition-colors duration-200 lg:px-3"
    >
      <span
        className={`relative h-6 w-6 flex-shrink-0 rounded-md border-2 transition-all duration-200 ${checked
            ? "bg-primary border-primary"
            : "lg:group-hover:border-primary border-gray-500 bg-white"
          } `}
      >
        <svg
          className={`absolute inset-0 h-full w-full p-0.5 text-white transition-all duration-150 ${checked ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 4.5L6.75 12.75L3 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={`title-3 transition-colors duration-200 ${checked ? "text-primary" : "lg:group-hover:text-primary text-gray-800"}`}
      >
        {label}
      </span>
    </button>
  );
}

interface ProductFilterProps {
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  category: string | null;
  selectedIngredients: string[];
  categoriesDisplay: Array<{ id: string; title: string; slug: string }>;
  ingredientsDisplay: Array<{ id: string; title: string; slug: string }>;
  handleCategoryClick: (slug: string) => void;
  toggleIngredient: (slug: string) => void;
  clearCategory: () => void;
  clearIngredients: () => void;
}

export default function ProductFilter({
  isFilterOpen,
  setIsFilterOpen,
  category,
  selectedIngredients,
  categoriesDisplay,
  ingredientsDisplay,
  handleCategoryClick,
  toggleIngredient,
  clearCategory,
  clearIngredients,
}: ProductFilterProps) {
  const t = useTranslations();

  useEffect(() => {
    if (isFilterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isFilterOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300 ease-in-out lg:hidden ${isFilterOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        onClick={() => setIsFilterOpen(false)}
      />
      <div
        className={`w-full flex-shrink-0 transition-transform duration-300 ease-in-out lg:block lg:max-w-[20rem] ${isFilterOpen
            ? "fixed top-0 right-0 bottom-0 z-[110] flex h-full max-h-screen w-[85%] max-w-[22.5rem] translate-x-0 transform flex-col overflow-hidden bg-white shadow-xl"
            : "translate-x-full transform max-lg:fixed max-lg:top-0 max-lg:right-0 max-lg:bottom-0 max-lg:z-[110] max-lg:flex max-lg:h-full max-lg:max-h-screen max-lg:w-[85%] max-lg:max-w-[22.5rem] max-lg:flex-col max-lg:overflow-hidden max-lg:bg-white max-lg:shadow-xl lg:block lg:translate-x-0 lg:bg-transparent lg:shadow-none lg:w-full"
          } `}
      >
        {/* Mobile Header */}
        <div
          className={`flex-shrink-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 transition-opacity duration-300 ease-in-out lg:hidden ${isFilterOpen ? "opacity-100" : "opacity-0"
            }`}
        >
          <span className="title-2 text-primary">{t("common.filter")}</span>
          <button
            onClick={() => setIsFilterOpen(false)}
            className="hover:text-primary text-gray-900 transition-colors p-1"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Filter Content */}
        <div className="lg:hidden flex-1 min-h-0 overflow-y-auto">
          <FilterContent />
        </div>
        <div className="hidden lg:block">
          <AnimateOnScroll animate="slideup" delay={200}>
            <FilterContent />
          </AnimateOnScroll>
        </div>
      </div>
    </>
  );

  function FilterContent() {
    const [showAllIngredients, setShowAllIngredients] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);

    const displayedIngredients = showAllIngredients
      ? ingredientsDisplay
      : ingredientsDisplay.slice(0, 5);
    const displayedCategories = showAllCategories
      ? categoriesDisplay
      : categoriesDisplay.slice(0, 5);

    return (
      <div
        className={`space-y-2 bg-white px-5 py-4 lg:p-0 ${isFilterOpen ? "pb-24" : "overflow-hidden rounded-2xl border border-gray-100 shadow-sm"} `}
      >
          <div className="space-y-3 pt-4 lg:pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between lg:px-3">
              <span className="text-lg lg:text-xl font-extrabold text-primary uppercase tracking-wider !font-display">
                {t("common.category")}
              </span>
              {category && (
                <button
                  type="button"
                  onClick={clearCategory}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200/80 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 transition-all duration-200 hover:bg-red-100 cursor-pointer"
                >
                  {t("common.clear")}
                </button>
              )}
            </div>
            <div>
              {displayedCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`title-3 w-full cursor-pointer py-2.5 text-left duration-300 ease-in-out lg:px-3 ${category === cat.slug
                      ? "bg-secondary/5 text-secondary font-semibold"
                      : "lg:hover:text-secondary text-gray-800"
                    } `}
                >
                  {cat.title}
                </button>
              ))}

              {categoriesDisplay.length > 5 && (
                <div className="pt-2 lg:px-3">
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors duration-200 lg:hover:text-secondary cursor-pointer"

                  >
                    <span>
                      {showAllCategories
                        ? t("common.collapse")
                        : `${t("common.view_more")} (${categoriesDisplay.length - 5})`}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${showAllCategories ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"

                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between py-1 lg:px-3">
              <span className="text-lg lg:text-xl font-extrabold text-primary uppercase tracking-wider !font-display">
                {t("common.ingredient")}
              </span>
              {selectedIngredients.length > 0 && (
                <button
                  type="button"
                  onClick={clearIngredients}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200/80 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 transition-all duration-200 hover:bg-red-100 cursor-pointer"
                >
                  {t("common.clear")} ({selectedIngredients.length})
                </button>
              )}
            </div>
            <div className="space-y-2 pb-2 lg:px-0">
              {displayedIngredients.map((ing) => (
                <CustomCheckbox
                  key={ing.id}
                  checked={selectedIngredients.includes(ing.slug)}
                  onChange={() => toggleIngredient(ing.slug)}
                  label={ing.title}
                />
              ))}

              {ingredientsDisplay.length > 5 && (
                <div className="pt-2 lg:px-3">
                  <button
                    type="button"
                    onClick={() => setShowAllIngredients((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors duration-200 lg:hover:text-secondary cursor-pointer"

                  >
                    <span>
                      {showAllIngredients
                        ? t("common.collapse")
                        : `${t("common.view_more")} (${ingredientsDisplay.length - 5})`}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${showAllIngredients ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"

                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
    );
  }
}
