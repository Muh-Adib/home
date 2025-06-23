/**
 * Color Constants
 * Modern color palette with blue and yellow theme
 */

export const COLORS = {
  // Primary Colors
  PRIMARY: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main blue
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  
  // Secondary Colors (Yellow)
  SECONDARY: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308', // Main yellow
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },
  
  // Accent Colors
  ACCENT: {
    BLUE: '#3b82f6',
    YELLOW: '#eab308',
    ORANGE: '#f97316',
    GREEN: '#10b981',
    RED: '#ef4444',
    PURPLE: '#8b5cf6',
    PINK: '#ec4899',
  },
  
  // Neutral Colors
  NEUTRAL: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  
  // Status Colors
  STATUS: {
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
  
  // Background Colors
  BACKGROUND: {
    PRIMARY: '#ffffff',
    SECONDARY: '#f8fafc',
    DARK: '#0f172a',
    CARD: '#ffffff',
    CARD_DARK: '#1e293b',
  },
  
  // Text Colors
  TEXT: {
    PRIMARY: '#0f172a',
    SECONDARY: '#64748b',
    MUTED: '#94a3b8',
    INVERSE: '#ffffff',
  },
} as const;

export const GRADIENTS = {
  PRIMARY: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  SECONDARY: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
  SUNSET: 'linear-gradient(135deg, #3b82f6 0%, #eab308 100%)',
  OCEAN: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
  GOLDEN: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  MODERN: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 50%, #06b6d4 100%)',
} as const;

export const SHADOWS = {
  SM: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  MD: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  LG: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  XL: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2XL': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  INNER: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  GLOW: '0 0 20px rgb(59 130 246 / 0.3)',
  GLOW_YELLOW: '0 0 20px rgb(234 179 8 / 0.3)',
} as const;

export const BORDER_RADIUS = {
  NONE: '0px',
  SM: '0.125rem',
  DEFAULT: '0.25rem',
  MD: '0.375rem',
  LG: '0.5rem',
  XL: '0.75rem',
  '2XL': '1rem',
  '3XL': '1.5rem',
  FULL: '9999px',
} as const;

export const SPACING = {
  0: '0px',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  56: '14rem',
  64: '16rem',
} as const;

export default COLORS; 