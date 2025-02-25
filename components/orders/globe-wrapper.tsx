"use client"

import React, { useState, useEffect } from 'react'
import { GlobeVisualization } from './globe-visualization'
import { GlobeController } from './globe-controller'
import { useOrdersGlobe } from './globe-context'

interface GlobeWrapperProps {
  children: React.ReactNode
}

export function GlobeWrapper({ children }: GlobeWrapperProps) {
  const { orders, isDetailView } = useOrdersGlobe()
  const [isGlobeVisible, setIsGlobeVisible] = useState(false)
  const [globeKey, setGlobeKey] = useState(0)
  
  // Force re-render of the globe when orders or view type changes
  useEffect(() => {
    // Increment the key to force a complete re-render of the globe
    setGlobeKey(prev => prev + 1)
  }, [orders.length, isDetailView])
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Globe visualization */}
      <div 
        style={{ 
          position: 'fixed', 
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100vh',
          zIndex: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <GlobeVisualization 
          key={globeKey} 
          orders={orders} 
          isVisible={isGlobeVisible} 
          isDetailView={isDetailView}
        />
      </div>
      
      {/* Content container with keyboard control */}
      <GlobeController onToggleVisibility={setIsGlobeVisible}>
        <div 
          style={{
            position: 'relative',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.7)',
            minHeight: '100vh',
            width: '100%',
          }}
        >
          {children}
        </div>
      </GlobeController>
    </div>
  )
}
