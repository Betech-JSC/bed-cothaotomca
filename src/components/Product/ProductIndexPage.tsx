'use client'

import { useMemo } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import Breadcrumb from '../Common/Breadcrumb'
import CardProduct from '../Card/CardProduct'

// ——— Data ———
const categories = [
  { title: 'Ngâm Tương Hàn Quốc', slug: 'ngam-tuong-han-quoc' },
  { title: 'Sốt Thái Tươi Mát', slug: 'sot-thai-tuoi-mat' },
  { title: 'Set Cơm Tiện Lợi', slug: 'set-com-tien-loi' },
  { title: 'Món Ăn Kèm', slug: 'mon-an-kem' },
]

const ingredientsList = [
  { title: 'Cá Hồi', slug: 'ca-hoi' },
  { title: 'Tôm Sú', slug: 'tom-su' },
  { title: 'Cua/Ghẹ', slug: 'cua-ghe' },
  { title: 'Bào Ngư', slug: 'bao-ngu' },
]

const products = [
  {
    id: 1,
    title: 'Cá Hồi Ngâm Tương Hàn Quốc',
    slug: 'ca-hoi-ngam-tuong-han-quoc',
    price: 285000,
    category: { title: 'Ngâm Tương Hàn Quốc', slug: 'ngam-tuong-han-quoc' },
    ingredients: ['ca-hoi'],
    image: { url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=600&fit=crop', alt: 'Cá Hồi Ngâm Tương' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-15T00:00:00Z',
  },
  {
    id: 2,
    title: 'Tôm Sú Ngâm Tương Ganjang',
    slug: 'tom-su-ngam-tuong-ganjang',
    price: 320000,
    category: { title: 'Ngâm Tương Hàn Quốc', slug: 'ngam-tuong-han-quoc' },
    ingredients: ['tom-su'],
    image: { url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800&h=600&fit=crop', alt: 'Tôm Sú' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-16T00:00:00Z',
  },
  {
    id: 3,
    title: 'Cua Ngâm Tương Đặc Biệt',
    slug: 'cua-ngam-tuong-dac-biet',
    price: 450000,
    category: { title: 'Ngâm Tương Hàn Quốc', slug: 'ngam-tuong-han-quoc' },
    ingredients: ['cua-ghe'],
    image: { url: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=800&h=600&fit=crop', alt: 'Cua Ngâm Tương' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-10T00:00:00Z',
  },
  {
    id: 4,
    title: 'Cá Hồi Sốt Thái Xanh',
    slug: 'ca-hoi-sot-thai-xanh',
    price: 260000,
    category: { title: 'Sốt Thái Tươi Mát', slug: 'sot-thai-tuoi-mat' },
    ingredients: ['ca-hoi'],
    image: { url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop', alt: 'Cá Hồi Sốt Thái' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-19T00:00:00Z',
  },
  {
    id: 5,
    title: 'Tôm Sú Sốt Thái Mango',
    slug: 'tom-su-sot-thai-mango',
    price: 295000,
    category: { title: 'Sốt Thái Tươi Mát', slug: 'sot-thai-tuoi-mat' },
    ingredients: ['tom-su'],
    image: { url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800&h=600&fit=crop', alt: 'Tôm Sú Sốt Thái' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-18T00:00:00Z',
  },
  {
    id: 6,
    title: 'Bào Ngư Sốt Thái Cay',
    slug: 'bao-ngu-sot-thai-cay',
    price: 520000,
    category: { title: 'Sốt Thái Tươi Mát', slug: 'sot-thai-tuoi-mat' },
    ingredients: ['bao-ngu'],
    image: { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop', alt: 'Bào Ngư Sốt Thái' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-17T00:00:00Z',
  },
  {
    id: 7,
    title: 'Set Cơm Cá Hồi Nhật',
    slug: 'set-com-ca-hoi-nhat',
    price: 185000,
    category: { title: 'Set Cơm Tiện Lợi', slug: 'set-com-tien-loi' },
    ingredients: ['ca-hoi'],
    image: { url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=600&fit=crop', alt: 'Set Cơm' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-14T00:00:00Z',
  },
  {
    id: 8,
    title: 'Set Cơm Tôm Sú & Rau',
    slug: 'set-com-tom-su-rau',
    price: 165000,
    category: { title: 'Set Cơm Tiện Lợi', slug: 'set-com-tien-loi' },
    ingredients: ['tom-su'],
    image: { url: 'https://images.unsplash.com/photo-1539755530862-00f623c00f52?w=800&h=600&fit=crop', alt: 'Set Cơm Tôm' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-13T00:00:00Z',
  },
  {
    id: 9,
    title: 'Set Cơm Hải Sản Hỗn Hợp',
    slug: 'set-com-hai-san-hon-hop',
    price: 210000,
    category: { title: 'Set Cơm Tiện Lợi', slug: 'set-com-tien-loi' },
    ingredients: ['cua-ghe', 'tom-su'],
    image: { url: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&h=600&fit=crop', alt: 'Cơm Hải Sản' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-12T00:00:00Z',
  },
  {
    id: 10,
    title: 'Gỏi Bào Ngư Rong Biển',
    slug: 'goi-bao-ngu-rong-bien',
    price: 380000,
    category: { title: 'Món Ăn Kèm', slug: 'mon-an-kem' },
    ingredients: ['bao-ngu'],
    image: { url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=600&fit=crop', alt: 'Gỏi Bào Ngư' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-11T00:00:00Z',
  },
  {
    id: 11,
    title: 'Ghẹ Hấp Bia Ăn Kèm',
    slug: 'ghe-hap-bia-an-kem',
    price: 340000,
    category: { title: 'Món Ăn Kèm', slug: 'mon-an-kem' },
    ingredients: ['cua-ghe'],
    image: { url: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=800&h=600&fit=crop', alt: 'Ghẹ Hấp' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-09T00:00:00Z',
  },
  {
    id: 12,
    title: 'Combo Hải Sản Tứ Bảo',
    slug: 'combo-hai-san-tu-bao',
    price: 620000,
    category: { title: 'Món Ăn Kèm', slug: 'mon-an-kem' },
    ingredients: ['ca-hoi', 'tom-su', 'cua-ghe', 'bao-ngu'],
    image: { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop', alt: 'Combo Hải Sản' },
    description: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source.',
    created_at: '2024-03-08T00:00:00Z',
  },
]


function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

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
      className="flex items-center gap-2 w-full px-3 py-2 group transition-colors duration-200 cursor-pointer"
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

interface ProductIndexPageProps {
  category: string | null
  selectedIngredients: string[]
}

export default function ProductIndexPage({
  category,
  selectedIngredients,
}: ProductIndexPageProps) {
  const router = useRouter()

  const pushWithFilters = (newCategory: string | null, newIngredients: string[]) => {
    const query: Record<string, string> = {}
    if (newIngredients.length > 0) {
      query.ingredients = newIngredients.join(',')
    }

    if (newCategory) {
      router.push({
        pathname: '/product/[category]',
        params: { category: newCategory },
        query: query
      })
    } else {
      router.push({
        pathname: '/product',
        query: query
      })
    }
  }

  const handleCategoryClick = (slug: string) => {
    const nextCategory = category === slug ? null : slug
    pushWithFilters(nextCategory, selectedIngredients)
  }

  const toggleIngredient = (slug: string) => {
    const nextIngredients = selectedIngredients.includes(slug)
      ? selectedIngredients.filter(s => s !== slug)
      : [...selectedIngredients, slug]
    pushWithFilters(category, nextIngredients)
  }

  const clearCategory = () => pushWithFilters(null, selectedIngredients)
  const clearIngredients = () => pushWithFilters(category, [])
  const clearAll = () => pushWithFilters(null, [])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const catMatch = !category || p.category.slug === category
      const ingMatch =
        selectedIngredients.length === 0 ||
        selectedIngredients.every(ing => p.ingredients.includes(ing))
      return catMatch && ingMatch
    })
  }, [category, selectedIngredients])

  const hasFilters = !!category || selectedIngredients.length > 0

  const currentCategory = useMemo(() => {
    return categories.find(cat => cat.slug === category)
  }, [category])

  const breadcrumbs = useMemo(() => {
    const base: { title: string; url?: any }[] = [
      { title: 'Sản phẩm', url: '/product' }
    ]
    if (currentCategory) {
      base.push({ title: currentCategory.title })
    }
    return base
  }, [currentCategory])

  return (
    <section className="py-[60px]">
      <div className="container space-y-8">

        <div className="flex flex-col items-center gap-4">
          <Breadcrumb breadcrumbs={breadcrumbs} />
          <h1 className="display-3 text-center text-primary">
            {currentCategory ? currentCategory.title : 'Sản phẩm'}
          </h1>
        </div>

        <div className='flex items-start gap-8'>
          <div className="max-w-[280px] w-full flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24 space-y-2">
              <div className="pt-4.5 space-y-3">
                <div className="px-3 flex items-center justify-between">
                  <span className="label-1 font-semibold text-gray-900">Danh mục</span>
                  {category && (
                    <button
                      onClick={clearCategory}
                      className="label-3 font-semibold text-primary lg:hover:text-secondary duration-300 ease-in-out cursor-pointer"
                    >
                      Xoá
                    </button>
                  )}
                </div>
                <div>
                  {categories.map(cat => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => handleCategoryClick(cat.slug)}
                      className={`
                        w-full text-left p-3 title-3 cursor-pointer duration-300 ease-in-out
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
                <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                  <span className="label-1 font-semibold text-gray-900">Nguyên liệu</span>
                  {selectedIngredients.length > 0 && (
                    <button
                      onClick={clearIngredients}
                      className="label-3 font-semibold text-primary lg:hover:text-secondary duration-300 ease-in-out cursor-pointer"
                    >
                      Xoá ({selectedIngredients.length})
                    </button>
                  )}
                </div>
                <div className="pb-2 space-y-2">
                  {ingredientsList.map(ing => (
                    <CustomCheckbox
                      key={ing.slug}
                      checked={selectedIngredients.includes(ing.slug)}
                      onChange={() => toggleIngredient(ing.slug)}
                      label={ing.title}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Clear all */}
            {/* {hasFilters && (
            <button
              onClick={clearAll}
              className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-orange-500 border border-gray-200 hover:border-orange-300 rounded-xl transition-all duration-200 bg-white shadow-sm"
            >
              Xoá tất cả bộ lọc
            </button>
          )} */}
          </div>
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-500 text-lg font-medium">Không tìm thấy sản phẩm phù hợp</p>
                <p className="text-gray-400 text-sm mt-1">Thử thay đổi bộ lọc để xem thêm kết quả</p>
                <button
                  onClick={clearAll}
                  className="mt-4 px-5 py-2 bg-orange-500 text-white text-sm rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
                >
                  Xoá bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8">
                {filteredProducts.map(product => (
                  <CardProduct key={product.id} item={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
