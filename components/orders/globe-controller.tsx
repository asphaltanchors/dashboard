"use client"

import React, { useEffect, useState } from 'react'

interface GlobeControllerProps {
  children: React.ReactNode
  onToggleVisibility: (isVisible: boolean) => void
}

export function GlobeController({ children, onToggleVisibility }: GlobeControllerProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'g') {
        setIsVisible(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  
  // Call the callback whenever visibility changes
  useEffect(() => {
    onToggleVisibility(isVisible)
  }, [isVisible, onToggleVisibility])
  
  return (
    <div 
      style={{
        transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out',
        transform: isVisible ? 'translateY(75vh)' : 'translateY(0)',
        width: '100%',
        overflow: 'hidden', // Prevent scrollbars
        position: 'relative',
        opacity: isVisible ? 0.9 : 1, // Slightly fade the content when globe is visible
      }}
    >
      {children}
    </div>
  )
}
