/**
 * Watch Registry
 * Centralized catalog of all available watch models
 */

import type { WatchConfiguration, WatchRegistry } from './types'

/**
 * Default watch configuration
 * Used as fallback and template for new watches
 */
export const DEFAULT_WATCH_CONFIG: WatchConfiguration = {
  id: 'default-watch',
  name: 'Default Watch',
  brand: 'Generic',
  category: 'casual',
  thumbnail: 'https://png.pngtree.com/png-vector/20230906/ourmid/pngtree-wristwatch-analog-classic-brown-leather-strap-watch-png-image_10001801.png',
  modelUrl: '/models/watch.glb',
  scale: 1.5,
  rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
  positionOffset: { x: 0, y: 0, z: 0 },
  occluderOffset: { x: 0, y: 0, z: 0 },
  smoothing: 0.3,
  description: 'Classic timepiece with elegant design',
  price: '$299',
}

/**
 * Watch Registry
 * Add new watches here with their specific configurations
 */
export const WATCH_REGISTRY: WatchRegistry = {
  'default-watch': DEFAULT_WATCH_CONFIG,

  'sport-watch-01': {
    id: 'sport-watch-01',
    name: 'Sport Pro',
    brand: 'ActiveTime',
    category: 'sports',
    thumbnail: 'https://png.pngtree.com/png-clipart/20250501/original/pngtree-a-black-and-gold-rolex-watch-png-image_20925413.png',
    modelUrl: '/models/watch.glb', // Will use same model for now
    scale: 1.8,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.02, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Rugged sports watch built for performance',
    price: '$399',
  },

  'luxury-watch-01': {
    id: 'luxury-watch-01',
    name: 'Elegance Elite',
    brand: 'LuxeTime',
    category: 'luxury',
    thumbnail: 'https://static.vecteezy.com/system/resources/thumbnails/009/379/868/small/realistic-watch-clipart-design-illustration-free-png.png',
    modelUrl: '/models/watch.glb',
    scale: 1.4,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: -0.01, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.4,
    description: 'Sophisticated luxury timepiece with premium finish',
    price: '$1,299',
  },

  'casual-watch-01': {
    id: 'casual-watch-01',
    name: 'Urban Classic',
    brand: 'CityWear',
    category: 'casual',
    thumbnail: 'https://pngimg.com/uploads/watches/watches_PNG9872.png',
    modelUrl: '/models/watch.glb',
    scale: 1.5,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Versatile casual watch for everyday wear',
    price: '$199',
  },

  'smart-watch-01': {
    id: 'smart-watch-01',
    name: 'Tech Connect',
    brand: 'SmartWear',
    category: 'smart',
    thumbnail: 'https://png.pngtree.com/png-vector/20250519/ourmid/pngtree-luxury-black-watch-render-elegant-wrist-accessory-png-image_16070984.png',
    modelUrl: '/models/watch.glb',
    scale: 1.6,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.01, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Smart watch with advanced fitness tracking',
    price: '$499',
  },

  'sport-watch-02': {
    id: 'sport-watch-02',
    name: 'Runner Elite',
    brand: 'ActiveTime',
    category: 'sports',
    thumbnail: 'https://pluspng.com/img-png/watch-png-hd-rolex-watch-png-photos-861.png',
    modelUrl: '/models/watch.glb',
    scale: 1.7,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.015, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Lightweight running watch with GPS',
    price: '$349',
  },

  'luxury-watch-02': {
    id: 'luxury-watch-02',
    name: 'Royal Chronograph',
    brand: 'LuxeTime',
    category: 'luxury',
    thumbnail: 'https://static.vecteezy.com/system/resources/thumbnails/009/379/868/small/realistic-watch-clipart-design-illustration-free-png.png',
    modelUrl: '/models/watch.glb',
    scale: 1.45,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: -0.005, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.4,
    description: 'Exquisite chronograph with Swiss movement',
    price: '$2,499',
  },

  'casual-watch-02': {
    id: 'casual-watch-02',
    name: 'Weekend Casual',
    brand: 'CityWear',
    category: 'casual',
    thumbnail: 'https://pngimg.com/uploads/watches/watches_PNG9872.png',
    modelUrl: '/models/watch.glb',
    scale: 1.55,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.005, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Relaxed style for weekend adventures',
    price: '$179',
  },

  'smart-watch-02': {
    id: 'smart-watch-02',
    name: 'Health Monitor Pro',
    brand: 'SmartWear',
    category: 'smart',
    thumbnail: 'https://png.pngtree.com/png-vector/20250519/ourmid/pngtree-luxury-black-watch-render-elegant-wrist-accessory-png-image_16070984.png',
    modelUrl: '/models/watch.glb',
    scale: 1.65,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.012, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Advanced health monitoring smartwatch',
    price: '$549',
  },

  'sport-watch-03': {
    id: 'sport-watch-03',
    name: 'Dive Master',
    brand: 'ActiveTime',
    category: 'sports',
    thumbnail: 'https://pluspng.com/img-png/watch-png-hd-rolex-watch-png-photos-861.png',
    modelUrl: '/models/watch.glb',
    scale: 1.75,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.018, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Professional diving watch, water resistant to 300m',
    price: '$599',
  },

  'luxury-watch-03': {
    id: 'luxury-watch-03',
    name: 'Prestige Gold',
    brand: 'LuxeTime',
    category: 'luxury',
    thumbnail: 'https://i.pinimg.com/originals/3c/1b/21/3c1b216ff3e0350cecc63f36f0a787d3.png',
    modelUrl: '/models/watch.glb',
    scale: 1.42,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: -0.008, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.4,
    description: 'Limited edition gold-plated masterpiece',
    price: '$4,999',
  },

  'casual-watch-03': {
    id: 'casual-watch-03',
    name: 'Minimalist Modern',
    brand: 'CityWear',
    category: 'casual',
    thumbnail: 'https://pngimg.com/uploads/watches/watches_PNG9872.png',
    modelUrl: '/models/watch.glb',
    scale: 1.48,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: -0.002, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Clean minimalist design for the modern professional',
    price: '$249',
  },

  'smart-watch-03': {
    id: 'smart-watch-03',
    name: 'Fitness Tracker Plus',
    brand: 'SmartWear',
    category: 'smart',
    thumbnail: 'https://png.pngtree.com/png-vector/20250519/ourmid/pngtree-luxury-black-watch-render-elegant-wrist-accessory-png-image_16070984.png',
    modelUrl: '/models/watch.glb',
    scale: 1.62,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.008, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Complete fitness tracking with heart rate monitor',
    price: '$429',
  },

  'sport-watch-04': {
    id: 'sport-watch-04',
    name: 'Trail Blazer',
    brand: 'ActiveTime',
    category: 'sports',
    thumbnail: 'https://pluspng.com/img-png/watch-png-hd-rolex-watch-png-photos-861.png',
    modelUrl: '/models/watch.glb',
    scale: 1.72,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.016, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Outdoor adventure watch with altitude tracker',
    price: '$449',
  },

  'luxury-watch-04': {
    id: 'luxury-watch-04',
    name: 'Diamond Elegance',
    brand: 'LuxeTime',
    category: 'luxury',
    thumbnail: 'https://i.pinimg.com/originals/3c/1b/21/3c1b216ff3e0350cecc63f36f0a787d3.png',
    modelUrl: '/models/watch.glb',
    scale: 1.38,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: -0.012, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.4,
    description: 'Diamond-studded luxury watch for special occasions',
    price: '$8,999',
  },

  'casual-watch-04': {
    id: 'casual-watch-04',
    name: 'Retro Classic',
    brand: 'CityWear',
    category: 'casual',
    thumbnail: 'https://pngimg.com/uploads/watches/watches_PNG9872.png',
    modelUrl: '/models/watch.glb',
    scale: 1.52,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.003, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Vintage-inspired design with modern reliability',
    price: '$229',
  },

  'smart-watch-04': {
    id: 'smart-watch-04',
    name: 'Business Smart',
    brand: 'SmartWear',
    category: 'smart',
    thumbnail: 'https://png.pngtree.com/png-vector/20250519/ourmid/pngtree-luxury-black-watch-render-elegant-wrist-accessory-png-image_16070984.png',
    modelUrl: '/models/watch.glb',
    scale: 1.58,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.006, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Professional smartwatch with business features',
    price: '$629',
  },

  'sport-watch-05': {
    id: 'sport-watch-05',
    name: 'Marathon Timer',
    brand: 'ActiveTime',
    category: 'sports',
    thumbnail: 'https://pluspng.com/img-png/watch-png-hd-rolex-watch-png-photos-861.png',
    modelUrl: '/models/watch.glb',
    scale: 1.68,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.014, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Long-distance running companion with stamina tracking',
    price: '$379',
  },

  'luxury-watch-05': {
    id: 'luxury-watch-05',
    name: 'Platinum Heritage',
    brand: 'LuxeTime',
    category: 'luxury',
    thumbnail: 'https://i.pinimg.com/originals/3c/1b/21/3c1b216ff3e0350cecc63f36f0a787d3.png',
    modelUrl: '/models/watch.glb',
    scale: 1.43,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: -0.006, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.4,
    description: 'Heirloom-quality platinum timepiece',
    price: '$12,999',
  },

  'casual-watch-05': {
    id: 'casual-watch-05',
    name: 'Canvas Strap',
    brand: 'CityWear',
    category: 'casual',
    thumbnail: 'https://pngimg.com/uploads/watches/watches_PNG9872.png',
    modelUrl: '/models/watch.glb',
    scale: 1.54,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.004, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Comfortable canvas strap for all-day wear',
    price: '$159',
  },

  'smart-watch-05': {
    id: 'smart-watch-05',
    name: 'Gaming Edition',
    brand: 'SmartWear',
    category: 'smart',
    thumbnail: 'https://png.pngtree.com/png-vector/20250519/ourmid/pngtree-luxury-black-watch-render-elegant-wrist-accessory-png-image_16070984.png',
    modelUrl: '/models/watch.glb',
    scale: 1.64,
    rotationOffset: { x: Math.PI / 2, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0.01, z: 0 },
    occluderOffset: { x: 0, y: 0, z: 0 },
    smoothing: 0.3,
    description: 'Gamer-focused smartwatch with performance stats',
    price: '$479',
  },
}

/**
 * Helper functions
 */

export function getWatchById(id: string): WatchConfiguration | null {
  return WATCH_REGISTRY[id] || null
}

export function getAllWatches(): WatchConfiguration[] {
  return Object.values(WATCH_REGISTRY)
}

export function getWatchesByCategory(
  category: 'sports' | 'luxury' | 'casual' | 'smart'
): WatchConfiguration[] {
  return getAllWatches().filter((watch) => watch.category === category)
}

export function getWatchesByBrand(brand: string): WatchConfiguration[] {
  return getAllWatches().filter((watch) => watch.brand === brand)
}

export function getWatchIds(): string[] {
  return Object.keys(WATCH_REGISTRY)
}
