import React, { lazy } from 'react';

/**
 * Lazy-loaded component wrappers for heavy dependencies
 * 
 * This file provides lazy-loaded wrappers for large libraries to improve initial bundle size.
 * Components are loaded on-demand when they're actually needed.
 * 
 * Usage:
 * import { Suspense } from 'react';
 * import { BigCalendar } from '@/lib/lazy-components';
 * 
 * <Suspense fallback={<LoadingSpinner />}>
 *   <BigCalendar {...props} />
 * </Suspense>
 */

// ============================================================================
// Charts (Recharts - ~360KB)
// ============================================================================

export const BarChart = lazy(() =>
    import('recharts').then(m => ({ default: m.BarChart }))
);

export const LineChart = lazy(() =>
    import('recharts').then(m => ({ default: m.LineChart }))
);

export const PieChart = lazy(() =>
    import('recharts').then(m => ({ default: m.PieChart }))
);

export const AreaChart = lazy(() =>
    import('recharts').then(m => ({ default: m.AreaChart }))
);

export const RadarChart = lazy(() =>
    import('recharts').then(m => ({ default: m.RadarChart }))
);

export const ComposedChart = lazy(() =>
    import('recharts').then(m => ({ default: m.ComposedChart }))
);

// Recharts components
export const XAxis = lazy(() =>
    import('recharts').then(m => ({ default: m.XAxis }))
);

export const YAxis = lazy(() =>
    import('recharts').then(m => ({ default: m.YAxis }))
);

export const CartesianGrid = lazy(() =>
    import('recharts').then(m => ({ default: m.CartesianGrid }))
);

export const Tooltip = lazy(() =>
    import('recharts').then(m => ({ default: m.Tooltip }))
);

export const Legend = lazy(() =>
    import('recharts').then(m => ({ default: m.Legend }))
);

export const ResponsiveContainer = lazy(() =>
    import('recharts').then(m => ({ default: m.ResponsiveContainer }))
);

export const Bar = lazy(() =>
    import('recharts').then(m => ({ default: m.Bar as any }))
);

export const Line = lazy(() =>
    import('recharts').then(m => ({ default: m.Line as any }))
);

export const Area = lazy(() =>
    import('recharts').then(m => ({ default: m.Area as any }))
);

export const Pie = lazy(() =>
    import('recharts').then(m => ({ default: m.Pie as any }))
);

export const Cell = lazy(() =>
    import('recharts').then(m => ({ default: m.Cell as any }))
);

// ============================================================================
// Calendar (react-big-calendar - ~150KB)
// ============================================================================

// @ts-ignore - react-big-calendar doesn't have type definitions
export const BigCalendar = lazy(() =>
    import('react-big-calendar').then(m => ({ default: m.Calendar }))
);

// Note: momentLocalizer and dateFnsLocalizer are factory functions, not components
// Import them normally where needed:
// import { momentLocalizer, dateFnsLocalizer } from 'react-big-calendar';
// const localizer = momentLocalizer(moment);

// ============================================================================
// Maps (Leaflet - ~154KB)
// ============================================================================

export const MapContainer = lazy(() =>
    import('react-leaflet').then(m => ({ default: m.MapContainer }))
);

export const TileLayer = lazy(() =>
    import('react-leaflet').then(m => ({ default: m.TileLayer }))
);

export const Marker = lazy(() =>
    import('react-leaflet').then(m => ({ default: m.Marker }))
);

export const Popup = lazy(() =>
    import('react-leaflet').then(m => ({ default: m.Popup }))
);

export const Circle = lazy(() =>
    import('react-leaflet').then(m => ({ default: m.Circle }))
);

export const Polyline = lazy(() =>
    import('react-leaflet').then(m => ({ default: m.Polyline }))
);

// ============================================================================
// Markdown (react-markdown - ~158KB)
// ============================================================================

export const ReactMarkdown = lazy(() =>
    import('react-markdown')
);

// Note: rehype-raw and remark-gfm are plugins, not components
// Import them normally where needed:
// import rehypeRaw from 'rehype-raw';
// import remarkGfm from 'remark-gfm';

// ============================================================================  
// Framer Motion (framer-motion - varies)
// ============================================================================

export const Motion = lazy(() =>
    import('framer-motion').then(m => ({ default: m.motion }))
);

export const AnimatePresence = lazy(() =>
    import('framer-motion').then(m => ({ default: m.AnimatePresence }))
);

export const LayoutGroup = lazy(() =>
    import('framer-motion').then(m => ({ default: m.LayoutGroup }))
);

// ============================================================================
// AOS (Animation on Scroll)
// ============================================================================

// Note: AOS is initialized globally in app.tsx
// It's a utility library, not a React component
// Import normally where needed: import AOS from 'aos';

// ============================================================================
// Date Picker (react-day-picker)
// ============================================================================

export const DayPicker = lazy(() =>
    import('react-day-picker').then(m => ({ default: m.DayPicker }))
);

// ============================================================================
// Dropzone (react-dropzone)
// ============================================================================

export const Dropzone = lazy(() =>
    import('react-dropzone').then(m => ({ default: m.default }))
);
