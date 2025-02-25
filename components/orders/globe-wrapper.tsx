"use client"

import React, { useState } from 'react'
import { GlobeVisualization } from './globe-visualization'
import { GlobeController } from './globe-controller'
import type { TableOrder } from '@/types/orders'

interface GlobeWrapperProps {
  orders: TableOrder[]
  children: React.ReactNode
}

export function GlobeWrapper({ orders, children }: GlobeWrapperProps) {
  const [isGlobeVisible, setIsGlobeVisible] = useState(false)
  
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
        <GlobeVisualization orders={orders} isVisible={isGlobeVisible} />
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
