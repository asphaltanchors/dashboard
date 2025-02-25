"use client"

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { TableOrder } from '@/types/orders'

// Dynamically import Globe component with no SSR
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

// Mapbox token from environment variables
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidGVpY2giLCJhIjoiY203a3Vxam95MDR2aTJtcTAzZml5eDVmdyJ9.nnx4yhTgDB-GMrCGUMJoJQ'

// Cache for geocoded addresses to avoid duplicate API calls
const geocodeCache: Record<string, { lat: number, lng: number } | null> = {}

// Geocoding function using Mapbox API
const getCoordinates = async (address: TableOrder['shippingAddress']) => {
  if (!address) return null
  
  // Skip if we don't have enough address information
  if (!address.city && !address.state && !address.country) return null
  
  // Create a cache key from the address components
  const cacheKey = [
    address.line1 || '',
    address.city || '',
    address.state || '',
    address.postalCode || '',
    address.country || 'US' // Default to US if not specified
  ].join('|')
  
  // Return cached result if available
  if (geocodeCache[cacheKey] !== undefined) {
    return geocodeCache[cacheKey]
  }
  
  // Build the address query string
  let query = ''
  if (address.line1) query += address.line1 + ', '
  if (address.city) query += address.city + ', '
  if (address.state) query += address.state + ', '
  if (address.postalCode) query += address.postalCode + ', '
  if (address.country) query += address.country
  else query += 'US' // Default to US if country not specified
  
  try {
    // Make request to Mapbox Geocoding API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    )
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Check if we got valid results
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      const result = { lat, lng }
      
      // Cache the result
      geocodeCache[cacheKey] = result
      return result
    }
    
    // No results found, cache null
    geocodeCache[cacheKey] = null
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    
    // On error, fall back to approximate coordinates based on state
    if (address.state) {
      const stateCoordinates: Record<string, [number, number]> = {
        'AL': [32.806671, -86.791130],
        'AK': [61.370716, -152.404419],
        'AZ': [33.729759, -111.431221],
        'AR': [34.969704, -92.373123],
        'CA': [36.116203, -119.681564],
        'CO': [39.059811, -105.311104],
        'CT': [41.597782, -72.755371],
        'DE': [39.318523, -75.507141],
        'FL': [27.766279, -81.686783],
        'GA': [33.040619, -83.643074],
        'HI': [21.094318, -157.498337],
        'ID': [44.240459, -114.478828],
        'IL': [40.349457, -88.986137],
        'IN': [39.849426, -86.258278],
        'IA': [42.011539, -93.210526],
        'KS': [38.526600, -96.726486],
        'KY': [37.668140, -84.670067],
        'LA': [31.169546, -91.867805],
        'ME': [44.693947, -69.381927],
        'MD': [39.063946, -76.802101],
        'MA': [42.230171, -71.530106],
        'MI': [43.326618, -84.536095],
        'MN': [45.694454, -93.900192],
        'MS': [32.741646, -89.678696],
        'MO': [38.456085, -92.288368],
        'MT': [46.921925, -110.454353],
        'NE': [41.125370, -98.268082],
        'NV': [38.313515, -117.055374],
        'NH': [43.452492, -71.563896],
        'NJ': [40.298904, -74.521011],
        'NM': [34.840515, -106.248482],
        'NY': [42.165726, -74.948051],
        'NC': [35.630066, -79.806419],
        'ND': [47.528912, -99.784012],
        'OH': [40.388783, -82.764915],
        'OK': [35.565342, -96.928917],
        'OR': [44.572021, -122.070938],
        'PA': [40.590752, -77.209755],
        'RI': [41.680893, -71.511780],
        'SC': [33.856892, -80.945007],
        'SD': [44.299782, -99.438828],
        'TN': [35.747845, -86.692345],
        'TX': [31.054487, -97.563461],
        'UT': [40.150032, -111.862434],
        'VT': [44.045876, -72.710686],
        'VA': [37.769337, -78.169968],
        'WA': [47.400902, -121.490494],
        'WV': [38.491226, -80.954453],
        'WI': [44.268543, -89.616508],
        'WY': [42.755966, -107.302490]
      }
      
      if (stateCoordinates[address.state]) {
        const [lat, lng] = stateCoordinates[address.state]
        // Add a small random offset
        const result = {
          lat: lat + (Math.random() - 0.5) * 2,
          lng: lng + (Math.random() - 0.5) * 2
        }
        
        // Cache the fallback result
        geocodeCache[cacheKey] = result
        return result
      }
    }
    
    // Last resort fallback to a random position in the US
    const fallback = {
      lat: 37.0902 + (Math.random() - 0.5) * 10,
      lng: -95.7129 + (Math.random() - 0.5) * 10
    }
    
    // Cache the fallback result
    geocodeCache[cacheKey] = fallback
    return fallback
  }
}


interface GlobeVisualizationProps {
  orders: TableOrder[]
  isVisible?: boolean
}

interface GlobePoint {
  lat: number
  lng: number
  value: number
  city: string
  orderNumber: string
}

export function GlobeVisualization({ orders, isVisible = false }: GlobeVisualizationProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeEl = useRef<any>(null)
  const [points, setPoints] = useState<GlobePoint[]>([])
  
  // Process orders to get points for the globe
  useEffect(() => {
    // Flag to handle component unmounting
    let isMounted = true
    
    // Process orders in batches to avoid overwhelming the API
    const batchSize = 10
    const processedPoints: GlobePoint[] = []
    
    const processOrders = async () => {
      // Process orders in batches
      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize)
        
        // Process each batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (order) => {
            const coords = await getCoordinates(order.shippingAddress)
            if (!coords) return null
            
            return {
              lat: coords.lat,
              lng: coords.lng,
              value: Math.min(0.2, order.totalAmount / 50000), // Scale down and cap the maximum height
              city: order.shippingAddress?.city || 'Unknown',
              orderNumber: order.orderNumber
            }
          })
        )
        
        // Add valid points from this batch
        batchResults.forEach(point => {
          if (point) processedPoints.push(point)
        })
        
        // Update points state with what we have so far
        if (isMounted) {
          setPoints([...processedPoints])
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    processOrders()
    
    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [orders])
  
  // Set up globe controls when the component mounts
  useEffect(() => {
    if (globeEl.current) {
      // Disable auto-rotation
      globeEl.current.controls().autoRotate = false
      
      // Optional: set rotation speed if auto-rotation is enabled
      // globeEl.current.controls().autoRotateSpeed = isVisible ? 2 : 0.5
    }
  }, [isVisible])
  
  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 0,
        opacity: isVisible ? 1 : 0.5,
        transition: 'opacity 0.5s ease-in-out',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        pointsData={points}
        pointAltitude={(d) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const point = d as any;
          const val = point.value;
          // Use a logarithmic scale to better show differences
          return Math.log10(1 + val * 10) * 0.25; // Increased by 5x
        }}
        pointColor={() => '#ff5722'}
        pointRadius={0.5}
        pointsMerge={true}
        atmosphereColor="rgba(65,105,225,0.3)"
        atmosphereAltitude={0.1}
        backgroundColor="rgba(0,0,0,0)"
      />
    </div>
  )
}
