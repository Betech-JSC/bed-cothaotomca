import React from 'react'

interface ServerScriptLoaderProps {
  html: string
  keyPrefix: string
}

function parseAttributes(attrStr: string): Record<string, any> {
  const attrs: Record<string, any> = {}
  // Match key="value", key='value', or key (boolean)
  const attrRegex = /([a-zA-Z0-9:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match
  
  while ((match = attrRegex.exec(attrStr)) !== null) {
    const name = match[1]
    let value: any = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] !== undefined ? match[4] : true))
    
    // Map standard HTML attribute names to React camelCase equivalents
    let reactName = name
    if (name === 'class') reactName = 'className'
    else if (name === 'crossorigin') reactName = 'crossOrigin'
    else if (name === 'charset') reactName = 'charSet'
    else if (name === 'http-equiv') reactName = 'httpEquiv'
    else if (name === 'nomodule') reactName = 'noModule'
    else if (name === 'referrerpolicy') reactName = 'referrersPolicy'
    
    if (value === 'true') value = true
    if (value === 'false') value = false
    
    attrs[reactName] = value
  }
  return attrs
}

export default function ServerScriptLoader({ html, keyPrefix }: ServerScriptLoaderProps) {
  if (!html) return null

  const elements: React.ReactNode[] = []
  // Matches <script ...>content</script>, <style ...>content</style>, <link ...>, <meta ...>, <noscript ...>content</noscript>
  const regex = /<(script|style|link|meta|noscript)\b([^>]*?)>([\s\S]*?)<\/\1>|<(link|meta)\b([^>]*?)\/?>/gi
  
  let match
  let index = 0
  
  while ((match = regex.exec(html)) !== null) {
    const key = `${keyPrefix}-${index++}`
    
    if (match[1]) {
      // Tags that have closing tags: script, style, link, meta, noscript
      const type = match[1].toLowerCase()
      const attrStr = match[2]
      const content = match[3]
      const attrs = parseAttributes(attrStr)
      
      if (type === 'script') {
        if (content && content.trim()) {
          elements.push(
            <script
              key={key}
              {...attrs}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )
        } else {
          elements.push(<script key={key} {...attrs} />)
        }
      } else if (type === 'style') {
        elements.push(
          <style
            key={key}
            {...attrs}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )
      } else if (type === 'link') {
        elements.push(<link key={key} {...attrs} />)
      } else if (type === 'meta') {
        elements.push(<meta key={key} {...attrs} />)
      } else if (type === 'noscript') {
        elements.push(
          <noscript
            key={key}
            {...attrs}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )
      }
    } else if (match[4]) {
      // Self-closing tags: link, meta
      const type = match[4].toLowerCase()
      const attrStr = match[5]
      const attrs = parseAttributes(attrStr)
      
      if (type === 'link') {
        elements.push(<link key={key} {...attrs} />)
      } else if (type === 'meta') {
        elements.push(<meta key={key} {...attrs} />)
      }
    }
  }

  return <>{elements}</>
}
