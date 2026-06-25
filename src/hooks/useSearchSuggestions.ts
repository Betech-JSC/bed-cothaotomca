import { useState, useEffect, useRef } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface SearchSuggestion {
  id: number
  name: string
  slug: string
  image: string | null
  price: number | string
  min_price: number | string | null
  category: { id: string | number; title: string; slug: string } | null
}

export function useSearchSuggestions(query: string, locale: string = 'vi') {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel previous request
    abortRef.current?.abort()

    if (query.trim().length < 2) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const timer = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(
          `${API_URL}/products/suggestions?search=${encodeURIComponent(query.trim())}&limit=6&lang=${locale}`,
          { signal: controller.signal }
        )
        const json = await res.json()
        if (!controller.signal.aborted) {
          setSuggestions(json.data || [])
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setSuggestions([])
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
    setSuggestions([])
    setIsLoading(false)
  }

  return { suggestions, isLoading, clearSuggestions }
}
