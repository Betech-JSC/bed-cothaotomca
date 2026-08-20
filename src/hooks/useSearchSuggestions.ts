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

export function useSearchSuggestions(query: string, locale: string = 'vi') {
  const [productSuggestions, setProductSuggestions] = useState<SearchProductSuggestion[]>([])
  const [blogSuggestions, setBlogSuggestions] = useState<SearchBlogSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel previous request
    abortRef.current?.abort()

    if (query.trim().length < 2) {
      setProductSuggestions([])
      setBlogSuggestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const timer = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const [prodRes, blogRes] = await Promise.all([
          fetch(
            `${API_URL}/products/suggestions?search=${encodeURIComponent(query.trim())}&limit=4&lang=${locale}`,
            { signal: controller.signal }
          ).then(res => res.json()).catch(() => ({ data: [] })),
          fetch(
            `${API_URL}/blogs/suggestions?search=${encodeURIComponent(query.trim())}&limit=4&lang=${locale}`,
            { signal: controller.signal }
          ).then(res => res.json()).catch(() => ({ data: [] }))
        ])

        if (!controller.signal.aborted) {
          setProductSuggestions(prodRes.data || [])
          setBlogSuggestions(blogRes.data || [])
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setProductSuggestions([])
          setBlogSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 300) // debounce 300ms

    return () => clearTimeout(timer)
  }, [query, locale])

  const clearSuggestions = () => {
    setProductSuggestions([])
    setBlogSuggestions([])
    setIsLoading(false)
  }

  return { productSuggestions, blogSuggestions, isLoading, clearSuggestions }
}
