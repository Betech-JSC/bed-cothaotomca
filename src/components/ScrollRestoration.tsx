'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * ScrollRestoration component
 * Saves scroll position before navigation and restores it on back navigation
 * Prevents jerky scroll behavior by restoring position immediately
 */
export default function ScrollRestoration() {
  const pathname = usePathname()
  const scrollPositions = useRef<{ [key: string]: number }>({})
  const isRestoringRef = useRef(false)

  useEffect(() => {
    // Save scroll position before navigation
    const saveScrollPosition = () => {
      scrollPositions.current[pathname] = window.scrollY
    }

    // Restore scroll position on back/forward navigation
    const restoreScrollPosition = () => {
      if (isRestoringRef.current) return

      const savedPosition = scrollPositions.current[pathname]
      if (savedPosition !== undefined) {
        isRestoringRef.current = true
        
        // Restore immediately without animation to prevent jerky behavior
        window.scrollTo(0, savedPosition)
        
        // Reset flag after a short delay
        setTimeout(() => {
          isRestoringRef.current = false
        }, 100)
      }
    }

    // Save position on scroll (debounced)
    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(saveScrollPosition, 100)
    }

    // Listen to popstate (back/forward button)
    const handlePopState = () => {
      restoreScrollPosition()
    }

    // Save position before leaving page
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', saveScrollPosition)

    // Try to restore position on mount (for back navigation)
    restoreScrollPosition()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', saveScrollPosition)
      clearTimeout(scrollTimeout)
    }
  }, [pathname])

  return null
}
