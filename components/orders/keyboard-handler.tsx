"use client"

import React, { useEffect, useState } from 'react'

interface KeyboardHandlerProps {
  targetKey: string
  children: (isVisible: boolean) => React.ReactNode
}

export function KeyboardHandler({ targetKey, children }: KeyboardHandlerProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === targetKey.toLowerCase()) {
        setIsVisible(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [targetKey])
  
  return <>{children(isVisible)}</>
}
