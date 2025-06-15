import React, { useEffect, useRef } from 'react';

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

    useEffect(() => {
        if (!mapRef.current) return;

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
                await loadLeaflet();
                
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
                }

                // Initialize map
                mapInstanceRef.current = window.L.map(mapRef.current).setView([lat, lng], zoom);

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

            } catch (error) {
                console.error('Error loading map:', error);
            }
        };

        initializeMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [lat, lng, zoom, propertyName, address, draggable]);

    // Update marker position when props change
    useEffect(() => {
        if (markerRef.current && mapInstanceRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.setView([lat, lng], zoom);
        }
    }, [lat, lng, zoom]);

    return (
        <div 
            ref={mapRef} 
            style={{ height, width: '100%' }}
            className={`rounded-lg border ${className}`}
        />
    );
}; 