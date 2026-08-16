'use client'

import { useEffect, useRef } from 'react'

interface CustomScriptLoaderProps {
  html: string
  id: string
  position?: 'head' | 'body'
}

export default function CustomScriptLoader({ html, id, position = 'body' }: CustomScriptLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!html || !containerRef.current) return

    // Find all script tags in the container
    const scriptTags = containerRef.current.querySelectorAll('script')
    const addedScripts: HTMLScriptElement[] = []

    scriptTags.forEach((oldScript, index) => {
      const newScript = document.createElement('script')
      
      // Copy attributes
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value)
      })

      // Add unique identifier to identify scripts added by this component
      newScript.setAttribute('data-custom-script-id', `${id}-${index}`)

      // Copy content or src
      if (oldScript.src) {
        newScript.src = oldScript.src
      } else {
        newScript.textContent = oldScript.textContent
      }

      // Append to head or body
      const target = position === 'head' ? document.head : document.body
      target.appendChild(newScript)
      addedScripts.push(newScript)
    })

    // Clean up: remove scripts when component unmounts
    return () => {
      addedScripts.forEach((script) => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      })
    }
  }, [html, id, position])

  // Render the HTML content. Browser will load css/style/link/images,
  // while script tags will be parsed and re-created dynamically in the useEffect.
  return (
    <div 
      ref={containerRef} 
      dangerouslySetInnerHTML={{ __html: html }} 
      style={{ display: 'none' }}
    />
  )
}
