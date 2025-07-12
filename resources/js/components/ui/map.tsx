import React, { useEffect, useRef, useState } from 'react';

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

export const Map: React.FC<MapProps> = ({
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
    const [isMapContainerReady, setIsMapContainerReady] = useState(false);

    // Validate coordinates
    const isValidCoordinate = (coord: number) => {
        return !isNaN(coord) && isFinite(coord) && coord !== 0;
    };

    const isValidLat = isValidCoordinate(lat);
    const isValidLng = isValidCoordinate(lng);

    console.log('🗺️ Map Component Debug:', {
        lat,
        lng,
        isValidLat,
        isValidLng,
        propertyName,
        address,
        isMapContainerReady
    });

    // Check if map container is ready
    useEffect(() => {
        if (mapRef.current) {
            setIsMapContainerReady(true);
        }
    }, []);

    // Use callback ref to ensure container is ready
    const setMapRef = (node: HTMLDivElement | null) => {
        mapRef.current = node;
        if (node) {
            setIsMapContainerReady(true);
        } else {
            setIsMapContainerReady(false);
        }
    };

    // Invalidate map when container becomes ready
    useEffect(() => {
        if (isMapContainerReady && mapInstanceRef.current) {
            // Small delay to ensure DOM is fully rendered
            const timer = setTimeout(() => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                }
            }, 100);
            
            return () => clearTimeout(timer);
        }
    }, [isMapContainerReady]);

    useEffect(() => {
        // Wait for both map container and valid coordinates
        if (!isMapContainerReady || !isValidLat || !isValidLng) {
            console.warn('🗺️ Map initialization skipped:', {
                hasMapRef: !!mapRef.current,
                isMapContainerReady,
                isValidLat,
                isValidLng
            });
            
            if (!isMapContainerReady) {
                setError('Map container belum siap');
            } else if (!isValidLat || !isValidLng) {
                setError('Koordinat tidak valid');
            }
            
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Load Leaflet CSS and JS if not already loaded
        const loadLeaflet = async () => {
            if (!window.L) {
                // Load CSS
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
                cssLink.crossOrigin = '';
                document.head.appendChild(cssLink);

                // Load JS
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
                    script.crossOrigin = '';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
        };

        const initializeMap = async () => {
            try {
                console.log('🗺️ Initializing map with coordinates:', { lat, lng, zoom });
                await loadLeaflet();
                
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
                }

                // Ensure map container is still available
                if (!mapRef.current) {
                    throw new Error('Map container not available');
                }

                // Small delay to ensure DOM is fully rendered
                await new Promise(resolve => setTimeout(resolve, 50));

                // Initialize map
                mapInstanceRef.current = window.L.map(mapRef.current).setView([lat, lng], zoom);
                console.log('🗺️ Map initialized successfully');

                // Add tile layer
                window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(mapInstanceRef.current);

                // Add marker
                const markerOptions = draggable ? { draggable: true } : {};
                markerRef.current = window.L.marker([lat, lng], markerOptions)
                    .addTo(mapInstanceRef.current);

                // Add popup if property info is provided
                if (propertyName) {
                    const popupContent = `
                        <div style="text-align: center;">
                            <h4 style="margin: 0 0 8px 0; font-weight: 600;">${propertyName}</h4>
                            ${address ? `<p style="margin: 0; color: #666; font-size: 14px;">${address}</p>` : ''}
                        </div>
                    `;
                    markerRef.current.bindPopup(popupContent).openPopup();
                }

                // Handle draggable marker
                if (draggable && onLocationChange) {
                    markerRef.current.on('dragend', function(e: any) {
                        const position = e.target.getLatLng();
                        onLocationChange(position.lat, position.lng);
                    });
                }

                // Force map to update its size
                setTimeout(() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.invalidateSize();
                    }
                }, 100);

                setIsLoading(false);
                console.log('🗺️ Map loaded successfully');

            } catch (error) {
                console.error('🗺️ Error loading map:', error);
                console.error('🗺️ Map error details:', {
                    lat,
                    lng,
                    zoom,
                    propertyName,
                    address,
                    error: error instanceof Error ? error.message : error
                });
                setError('Gagal memuat peta');
                setIsLoading(false);
            }
        };

        initializeMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [lat, lng, zoom, propertyName, address, draggable, isValidLat, isValidLng, isMapContainerReady]);

    // Update marker position when props change
    useEffect(() => {
        if (markerRef.current && mapInstanceRef.current && isValidLat && isValidLng) {
            console.log('🗺️ Updating map position:', { lat, lng, zoom });
            markerRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.setView([lat, lng], zoom);
        }
    }, [lat, lng, zoom, isValidLat, isValidLng]);

    // If coordinates are invalid, show error message
    if (!isValidLat || !isValidLng) {
        return (
            <div 
                style={{ height, width: '100%' }}
                className={`rounded-lg border bg-gray-100 flex items-center justify-center ${className}`}
            >
                <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">🗺️</div>
                    <p className="font-medium">Peta tidak tersedia</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Koordinat: {lat}, {lng}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {!isValidLat && 'Latitude tidak valid'}
                        {!isValidLat && !isValidLng && ' • '}
                        {!isValidLng && 'Longitude tidak valid'}
                    </p>
                </div>
            </div>
        );
    }

    // Show loading state
    if (isLoading) {
        return (
            <div 
                style={{ height, width: '100%' }}
                className={`rounded-lg border bg-gray-100 flex items-center justify-center ${className}`}
            >
                <div className="text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Memuat peta...</p>
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
                <div className="text-center text-red-500">
                    <div className="text-4xl mb-2">❌</div>
                    <p className="font-medium">Gagal memuat peta</p>
                    <p className="text-sm text-red-400 mt-1">{error}</p>
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
}; 