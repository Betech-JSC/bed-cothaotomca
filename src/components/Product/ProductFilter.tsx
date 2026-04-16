'use client'

import { useTranslations } from 'next-intl'
import AnimateOnScroll from '../Animated/animated-appear'

// Custom Checkbox component
function CustomCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 w-full lg:px-3 py-2 group transition-colors duration-200 cursor-pointer"
    >
      <span
        className={`
          relative flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all duration-200
          ${checked
            ? 'bg-primary border-primary'
            : 'bg-white border-gray-500 lg:group-hover:border-primary'
          }
        `}
      >
        <svg className={`absolute inset-0 w-full h-full p-0.5 text-white transition-all duration-150 ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 4.5L6.75 12.75L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span
        className={`title-3 transition-colors duration-200 ${checked ? 'text-primary' : 'text-gray-800 lg:group-hover:text-primary'}`}
      >
        {label}
      </span>
    </button>
  )
}

interface ProductFilterProps {
  isFilterOpen: boolean
  setIsFilterOpen: (open: boolean) => void
  category: string | null
  selectedIngredients: string[]
  categoriesDisplay: Array<{ id: string; title: string; slug: string }>
  ingredientsDisplay: Array<{ id: string; title: string; slug: string }>
  handleCategoryClick: (slug: string) => void
  toggleIngredient: (slug: string) => void
  clearCategory: () => void
  clearIngredients: () => void
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
  const t = useTranslations()

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/50 lg:hidden transition-opacity duration-300 ease-in-out ${isFilterOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsFilterOpen(false)}
      />
      <div className={`
        lg:max-w-[280px] w-full flex-shrink-0 lg:block transition-transform duration-300 ease-in-out
        ${isFilterOpen
          ? 'fixed top-0 right-0 bottom-0 z-[110] w-[85%] max-w-[360px] bg-gray-50 flex flex-col shadow-xl transform translate-x-0'
          : 'max-lg:fixed max-lg:top-0 max-lg:right-0 max-lg:bottom-0 max-lg:z-[110] max-lg:w-[85%] max-lg:max-w-[360px] max-lg:bg-gray-50 max-lg:flex max-lg:flex-col max-lg:shadow-xl transform translate-x-full lg:translate-x-0 lg:block lg:static lg:w-full lg:bg-transparent lg:shadow-none'
        }
      `}>
        {/* Mobile Header */}
        <div className={`lg:hidden flex justify-between items-center py-4 px-5 bg-white border-b border-gray-100 transition-opacity duration-300 ease-in-out ${isFilterOpen ? 'opacity-100' : 'opacity-0'
          }`}>
          <span className="title-2 text-primary">{t('common.filter')}</span>
          <button onClick={() => setIsFilterOpen(false)} className="text-gray-900 hover:text-primary transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Filter Content */}
        <div className="lg:hidden">
          <FilterContent />
        </div>
        <div className="hidden lg:block">
          <AnimateOnScroll animate="slideup" delay={200}>
            <FilterContent />
          </AnimateOnScroll>
        </div>
      </div>
    </>
  )

  function FilterContent() {
    return (
      <div className={`
        bg-white space-y-2 py-4 px-5 lg:p-0
        ${isFilterOpen ? 'flex-1 overflow-y-auto' : 'rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24'}
      `}>
        <div className="pt-4.5 space-y-3">
          <div className="lg:px-3 flex items-center justify-between">
            <span className="label-1 font-semibold text-gray-900">{t('common.category')}</span>
            {category && (
              <button
                onClick={clearCategory}
                className="label-3 font-semibold text-primary lg:hover:text-secondary duration-300 ease-in-out cursor-pointer"
              >
                {t('common.clear')}
              </button>
            )}
          </div>
          <div>
            {categoriesDisplay.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                className={`
                w-full text-left py-3 lg:px-3 title-3 cursor-pointer duration-300 ease-in-out
                ${category === cat.slug
                    ? 'bg-secondary/5 text-secondary'
                    : 'text-gray-800 lg:hover:text-secondary'
                  }
              `}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="lg:px-3 py-3 pb-1 flex items-center justify-between">
            <span className="label-1 font-semibold text-gray-900">{t('common.ingredient')}</span>
            {selectedIngredients.length > 0 && (
              <button
                onClick={clearIngredients}
                className="label-3 font-semibold text-primary lg:hover:text-secondary duration-300 ease-in-out cursor-pointer"
              >
                {t('common.clear')} ({selectedIngredients.length})
              </button>
            )}
          </div>
          <div className="lg:px-0 pb-2 space-y-2">
            {ingredientsDisplay.map(ing => (
              <CustomCheckbox
                key={ing.id}
                checked={selectedIngredients.includes(ing.slug)}
                onChange={() => toggleIngredient(ing.slug)}
                label={ing.title}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }
}