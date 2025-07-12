import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface MapProps {
    lat: number;
    lng: number;
    zoom?: number;
    height?: string;
    className?: string;
    propertyName?: string;
    address?: string;
    draggable?: boolean;
    onLocationChange?: (lat: number, lng: number) => void;
}

declare global {
    interface Window {
        L: any;
    }
}

// Global Leaflet loading state
let leafletLoadingPromise: Promise<void> | null = null;
let leafletLoaded = false;

// Preload Leaflet CSS
const preloadLeafletCSS = () => {
    if (document.querySelector('link[href*="leaflet"]')) {
        return;
    }
    
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    cssLink.crossOrigin = '';
    document.head.appendChild(cssLink);
};

// Load Leaflet library once
const loadLeaflet = (): Promise<void> => {
    console.log('🗺️ loadLeaflet called, current state:', { leafletLoaded, leafletLoadingPromise: !!leafletLoadingPromise });
    
    if (leafletLoaded) {
        console.log('🗺️ Leaflet already loaded, returning resolved promise');
        return Promise.resolve();
    }
    
    if (leafletLoadingPromise) {
        console.log('🗺️ Leaflet loading in progress, returning existing promise');
        return leafletLoadingPromise;
    }
    
    // Preload CSS immediately
    preloadLeafletCSS();
    
    console.log('🗺️ Starting Leaflet loading process');
    
    leafletLoadingPromise = new Promise<void>((resolve, reject) => {
        // Check if already being loaded
        if (document.querySelector('script[src*="leaflet"]')) {
            console.log('🗺️ Leaflet script already in DOM, waiting for load');
            const checkInterval = setInterval(() => {
                if (window.L) {
                    console.log('🗺️ Leaflet detected in window.L');
                    clearInterval(checkInterval);
                    leafletLoaded = true;
                    resolve();
                }
            }, 50);
            return;
        }

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.async = true;
        
        script.onload = () => {
            console.log('🗺️ Leaflet script loaded successfully');
            leafletLoaded = true;
            resolve();
        };
        
        script.onerror = (error) => {
            console.error('🗺️ Failed to load Leaflet:', error);
            leafletLoadingPromise = null;
            reject(new Error('Failed to load Leaflet library'));
        };
        
        document.head.appendChild(script);
        console.log('🗺️ Leaflet script added to DOM');
    });
    
    return leafletLoadingPromise;
};

// Memoized Map component to prevent unnecessary re-renders
export const Map = React.memo<MapProps>(({
    lat,
    lng,
    zoom = 15,
    height = '300px',
    className = '',
    propertyName,
    address,
    draggable = false,
    onLocationChange
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLeafletReady, setIsLeafletReady] = useState(leafletLoaded);
    const initializationRef = useRef<boolean>(false);
    const [mapContainerReady, setMapContainerReady] = useState(false);

    // Callback ref to track when map container is available
    const setMapRef = useCallback((node: HTMLDivElement | null) => {
        console.log('🗺️ setMapRef called with node:', !!node);
        
        if (node) {
            mapRef.current = node;
            console.log('🗺️ Map container ref set, container is ready');
            setMapContainerReady(true);
        } else {
            mapRef.current = null;
            console.log('🗺️ Map container ref cleared');
            setMapContainerReady(false);
        }
    }, []);

    // Memoize coordinate validation
    const coordinateValidation = useMemo(() => {
        const isValidCoordinate = (coord: number) => {
            return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
        };
        
        const isValidLat = isValidCoordinate(lat) && lat >= -90 && lat <= 90;
        const isValidLng = isValidCoordinate(lng) && lng >= -180 && lng <= 180;
        
        return { isValidLat, isValidLng };
    }, [lat, lng]);

    const { isValidLat, isValidLng } = coordinateValidation;

    // Memoize debug log to prevent unnecessary console calls
    const debugInfo = useMemo(() => ({
        lat,
        lng,
        isValidLat,
        isValidLng,
        propertyName,
        address,
        isLeafletReady,
        mapContainerReady
    }), [lat, lng, isValidLat, isValidLng, propertyName, address, isLeafletReady, mapContainerReady]);

    console.log('🗺️ Map Component Debug:', debugInfo);

    // Initialize map with optimized loading
    const initializeMap = useCallback(async () => {
        console.log('🗺️ initializeMap called with:', {
            hasMapRef: !!mapRef.current,
            isValidLat,
            isValidLng,
            isLeafletReady,
            initializationRef: initializationRef.current
        });

        if (!mapRef.current || !isValidLat || !isValidLng || !isLeafletReady) {
            console.log('🗺️ Map initialization skipped:', {
                hasMapRef: !!mapRef.current,
                isValidLat,
                isValidLng,
                isLeafletReady
            });
            return;
        }

        // Prevent multiple initializations
        if (initializationRef.current) {
            console.log('🗺️ Map initialization already in progress, skipping');
            return;
        }
        
        console.log('🗺️ Starting map initialization');
        initializationRef.current = true;
        setIsLoading(true);
        setError(null);

        try {
            console.log('🗺️ Initializing map with coordinates:', { lat, lng, zoom });
            
            // Clean up existing map
            if (mapInstanceRef.current) {
                console.log('🗺️ Cleaning up existing map');
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }

            // Minimal delay for DOM readiness
            await new Promise(resolve => setTimeout(resolve, 10));

            // Check if container still exists
            if (!mapRef.current) {
                throw new Error('Map container not available');
            }

            console.log('🗺️ Creating Leaflet map instance');
            // Initialize map with optimized options
            mapInstanceRef.current = window.L.map(mapRef.current, {
                center: [lat, lng],
                zoom: zoom,
                zoomControl: true,
                attributionControl: true,
                fadeAnimation: false, // Disable fade for faster rendering
                zoomAnimation: true,
                markerZoomAnimation: true
            });

            console.log('🗺️ Map initialized successfully');

            // Add tile layer with optimized settings
            console.log('🗺️ Adding tile layer');
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                minZoom: 1,
                updateWhenZooming: false, // Optimize performance
                updateWhenIdle: true
            }).addTo(mapInstanceRef.current);

            // Add marker with optimized options
            console.log('🗺️ Adding marker');
            const markerOptions = draggable ? { 
                draggable: true,
                autoPan: false // Disable auto-pan for better performance
            } : {};
            
            markerRef.current = window.L.marker([lat, lng], markerOptions)
                .addTo(mapInstanceRef.current);

            // Add popup if property info is provided
            if (propertyName) {
                console.log('🗺️ Adding popup');
                const popupContent = `
                    <div style="text-align: center; min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; font-weight: 600; color: #333;">${propertyName}</h4>
                        ${address ? `<p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">${address}</p>` : ''}
                        <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">
                            ${lat.toFixed(6)}, ${lng.toFixed(6)}
                        </p>
                    </div>
                `;
                markerRef.current.bindPopup(popupContent).openPopup();
            }

            // Handle draggable marker
            if (draggable && onLocationChange) {
                markerRef.current.on('dragend', function(e: any) {
                    const position = e.target.getLatLng();
                    console.log('🗺️ Marker dragged to:', position);
                    onLocationChange(position.lat, position.lng);
                });
            }

            // Force map to update its size after initialization
            setTimeout(() => {
                if (mapInstanceRef.current) {
                    console.log('🗺️ Invalidating map size');
                    mapInstanceRef.current.invalidateSize();
                }
            }, 50); // Reduced delay

            console.log('🗺️ Map loading completed, setting isLoading to false');
            setIsLoading(false);
            console.log('🗺️ Map loaded successfully');

        } catch (error) {
            console.error('🗺️ Error loading map:', error);
            setError(error instanceof Error ? error.message : 'Gagal memuat peta');
            setIsLoading(false);
        } finally {
            console.log('🗺️ Map initialization completed, resetting initializationRef');
            initializationRef.current = false;
        }
    }, [lat, lng, zoom, propertyName, address, draggable, onLocationChange, isValidLat, isValidLng, isLeafletReady]);

    // Update marker and map view when coordinates change
    const updateMapPosition = useCallback(() => {
        if (markerRef.current && mapInstanceRef.current && isValidLat && isValidLng) {
            console.log('🗺️ Updating map position:', { lat, lng, zoom });
            
            try {
                markerRef.current.setLatLng([lat, lng]);
                mapInstanceRef.current.setView([lat, lng], zoom);
                
                // Update popup if it exists
                if (propertyName && markerRef.current.getPopup()) {
                    const popupContent = `
                        <div style="text-align: center; min-width: 200px;">
                            <h4 style="margin: 0 0 8px 0; font-weight: 600; color: #333;">${propertyName}</h4>
                            ${address ? `<p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">${address}</p>` : ''}
                            <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">
                                ${lat.toFixed(6)}, ${lng.toFixed(6)}
                            </p>
                        </div>
                    `;
                    markerRef.current.setPopupContent(popupContent);
                }
            } catch (error) {
                console.error('🗺️ Error updating map position:', error);
            }
        }
    }, [lat, lng, zoom, propertyName, address, isValidLat, isValidLng]);

    // Load Leaflet on component mount (only once)
    useEffect(() => {
        console.log('🗺️ useEffect for Leaflet loading called, isLeafletReady:', isLeafletReady);
        
        if (!isLeafletReady) {
            console.log('🗺️ Starting Leaflet loading process');
            
            // Add timeout fallback to prevent stuck loading
            const timeoutId = setTimeout(() => {
                console.warn('🗺️ Leaflet loading timeout, forcing ready state');
                setIsLeafletReady(true);
                setIsLoading(false);
            }, 10000); // 10 second timeout
            
            loadLeaflet()
                .then(() => {
                    console.log('🗺️ Leaflet loaded successfully, setting isLeafletReady to true');
                    clearTimeout(timeoutId);
                    setIsLeafletReady(true);
                })
                .catch(error => {
                    console.error('🗺️ Failed to load Leaflet:', error);
                    clearTimeout(timeoutId);
                    setError('Gagal memuat library peta');
                    setIsLoading(false);
                });
        } else {
            console.log('🗺️ Leaflet already ready, skipping loading');
        }
    }, [isLeafletReady]);

    // Monitor container availability and trigger initialization
    useEffect(() => {
        if (mapContainerReady && isLeafletReady && isValidLat && isValidLng && !mapInstanceRef.current) {
            console.log('🗺️ Container ready and all conditions met, triggering initialization');
            
            // Small delay to ensure DOM is fully rendered
            const timer = setTimeout(() => {
                if (mapRef.current && !mapInstanceRef.current) {
                    console.log('🗺️ Starting map initialization from container ready effect');
                    initializeMap();
                }
            }, 100);
            
            return () => clearTimeout(timer);
        }
    }, [mapContainerReady, isLeafletReady, isValidLat, isValidLng, initializeMap]);

    // Initialize map when Leaflet is loaded and coordinates are valid
    useEffect(() => {
        console.log('🗺️ useEffect for map initialization called:', {
            isLeafletReady,
            isValidLat,
            isValidLng,
            mapContainerReady,
            hasMapRef: !!mapRef.current
        });
        
        if (isLeafletReady && isValidLat && isValidLng) {
            // If container is not ready, wait for it
            if (!mapContainerReady || !mapRef.current) {
                console.log('🗺️ Map container not ready, waiting for container...');
                
                // Use a more robust approach to wait for container
                const checkContainer = () => {
                    if (mapRef.current) {
                        console.log('🗺️ Map container now available, calling initializeMap');
                        initializeMap();
                    } else {
                        console.log('🗺️ Map container still not available, retrying...');
                        setTimeout(checkContainer, 50);
                    }
                };
                
                // Start checking after a short delay
                setTimeout(checkContainer, 50);
                return;
            }
            
            console.log('🗺️ All conditions met, calling initializeMap');
            
            // Add timeout fallback for map initialization
            const timeoutId = setTimeout(() => {
                console.warn('🗺️ Map initialization timeout, forcing completion');
                setIsLoading(false);
                initializationRef.current = false;
            }, 15000); // 15 second timeout
            
            initializeMap().finally(() => {
                clearTimeout(timeoutId);
            });
        } else {
            console.log('🗺️ Map initialization conditions not met:', {
                isLeafletReady,
                isValidLat,
                isValidLng,
                mapContainerReady,
                hasMapRef: !!mapRef.current
            });
        }
    }, [isLeafletReady, initializeMap, isValidLat, isValidLng, mapContainerReady]);

    // Update map position when coordinates change
    useEffect(() => {
        if (!isLoading && !error && mapInstanceRef.current) {
            updateMapPosition();
        }
    }, [lat, lng, zoom, updateMapPosition, isLoading, error]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    // Monitor loading state changes
    useEffect(() => {
        console.log('🗺️ Loading state changed:', {
            isLoading,
            error,
            isLeafletReady,
            mapContainerReady,
            hasMapRef: !!mapRef.current,
            hasMapInstance: !!mapInstanceRef.current
        });
        
        // Fallback: If loading takes too long, force initialization
        if (isLoading && isLeafletReady && isValidLat && isValidLng) {
            const fallbackTimer = setTimeout(() => {
                console.warn('🗺️ Loading timeout, forcing map initialization');
                if (!mapInstanceRef.current) {
                    setIsLoading(false);
                    setError('Map gagal dimuat dalam waktu yang ditentukan');
                }
            }, 8000); // 8 second fallback
            
            return () => clearTimeout(fallbackTimer);
        }
    }, [isLoading, error, isLeafletReady, mapContainerReady, isValidLat, isValidLng]);

    // If coordinates are invalid, show error message
    if (!isValidLat || !isValidLng) {
        return (
            <div 
                style={{ height:'100%', width: '100%' }}
                className={`rounded-lg border bg-gray-100 flex items-center justify-center ${className}`}
            >
                <div className="text-center text-gray-500 p-4">
                    <div className="text-4xl mb-2">🗺️</div>
                    <p className="font-medium">Peta tidak tersedia</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Koordinat: {lat}, {lng}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {!isValidLat && 'Latitude tidak valid (harus -90 sampai 90)'}
                        {!isValidLat && !isValidLng && ' • '}
                        {!isValidLng && 'Longitude tidak valid (harus -180 sampai 180)'}
                    </p>
                </div>
            </div>
        );
    }

    // Show loading state
    if (isLoading) {
        return (
            <div 
                style={{ height:'100%', width: '100%' }}
                className={`rounded-lg border bg-gray-100 flex items-center justify-center ${className}`}
            >
                <div className="text-center text-gray-500 p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Memuat peta...</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {!isLeafletReady ? 'Memuat library peta...' : 
                         !mapContainerReady ? 'Menyiapkan container peta...' : 
                         'Menginisialisasi peta...'}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                        Debug: Leaflet={isLeafletReady ? 'Ready' : 'Loading'}, 
                        Container={mapContainerReady ? 'Ready' : 'Pending'},
                        Map={mapInstanceRef.current ? 'Created' : 'Pending'}
                    </p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div 
                style={{ height, width: '100%' }}
                className={`rounded-lg border bg-red-50 flex items-center justify-center ${className}`}
            >
                <div className="text-center text-red-500 p-4">
                    <div className="text-4xl mb-2">❌</div>
                    <p className="font-medium">Gagal memuat peta</p>
                    <p className="text-sm text-red-400 mt-1">{error}</p>
                    <button 
                        onClick={() => {
                            setError(null);
                            setIsLoading(true);
                            initializeMap();
                        }}
                        className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={setMapRef} 
            style={{ height, width: '100%' }}
            className={`rounded-lg border ${className}`}
        />
    );
});