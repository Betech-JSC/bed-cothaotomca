import { useState, useEffect, useRef } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface SearchProductSuggestion {
  id: number
  name: string
  slug: string
  image: string | null
  price: number | string
  min_price: number | string | null
  category: { id: string | number; title: string; slug: string } | null
}

export interface SearchBlogSuggestion {
  id: number
  title: string
  slug: string
  thumbnail: string | null
  category: { id: string | number; title: string; slug: string | null } | null
  created_at: string
}

export interface SearchPolicySuggestion {
  id: number
  title: string
  slug: string
}

export function useSearchSuggestions(query: string, locale: string = 'vi') {
  const [productSuggestions, setProductSuggestions] = useState<SearchProductSuggestion[]>([])
  const [blogSuggestions, setBlogSuggestions] = useState<SearchBlogSuggestion[]>([])
  const [policySuggestions, setPolicySuggestions] = useState<SearchPolicySuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel previous request
    abortRef.current?.abort()

    setIsLoading(true)
    const isSearch = query.trim().length >= 2

    const timer = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      const searchParam = isSearch ? `search=${encodeURIComponent(query.trim())}&` : ''

      try {
        const [prodRes, blogRes, policyRes] = await Promise.all([
          fetch(
            `${API_URL}/products/suggestions?${searchParam}limit=4&lang=${locale}`,
            { signal: controller.signal }
          ).then(res => res.json()).catch(() => ({ data: [] })),
          fetch(
            `${API_URL}/blogs/suggestions?${searchParam}limit=4&lang=${locale}`,
            { signal: controller.signal }
          ).then(res => res.json()).catch(() => ({ data: [] })),
          fetch(
            `${API_URL}/policies/suggestions?${searchParam}limit=3&lang=${locale}`,
            { signal: controller.signal }
          ).then(res => res.json()).catch(() => ({ data: [] }))
        ])

        if (!controller.signal.aborted) {
          setProductSuggestions(prodRes.data || [])
          setBlogSuggestions(blogRes.data || [])
          setPolicySuggestions(policyRes.data || [])
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setProductSuggestions([])
          setBlogSuggestions([])
          setPolicySuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, isSearch ? 300 : 50)

    return () => clearTimeout(timer)
  }, [query, locale])

  const clearSuggestions = () => {
    setProductSuggestions([])
    setBlogSuggestions([])
    setPolicySuggestions([])
    setIsLoading(false)
  }

  return { productSuggestions, blogSuggestions, policySuggestions, isLoading, clearSuggestions }
}
