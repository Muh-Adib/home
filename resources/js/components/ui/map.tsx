import React, { useEffect, useState } from 'react';

// Leaflet & react-leaflet hanya boleh di-load di browser (bukan saat SSR)
let L: typeof import('leaflet') | null = null;
let RL: typeof import('react-leaflet') | null = null;

if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    L = require('leaflet');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RL = require('react-leaflet');
    // Import CSS di client-side saja
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('leaflet/dist/leaflet.css');
}

// Fix for default markers in React Leaflet (hanya ketika Leaflet sudah tersedia)
if (typeof window !== 'undefined' && L) {
    delete (L!.Icon.Default.prototype as any)._getIconUrl;
    L!.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

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

// Component untuk update map position ketika props berubah
const MapUpdater: React.FC<{ lat: number; lng: number; zoom: number }> = ({ lat, lng, zoom }) => {
    if (!RL) return null;
    const { useMap } = RL;
    const map = useMap();

    useEffect(() => {
        map.setView([lat, lng], zoom);
    }, [lat, lng, zoom, map]);

    return null;
};

// Component untuk draggable marker
const DraggableMarker: React.FC<{
    lat: number;
    lng: number;
    propertyName?: string;
    address?: string;
    onLocationChange?: (lat: number, lng: number) => void;
}> = ({ lat, lng, propertyName, address, onLocationChange }) => {
    if (!RL || !L) return null;
    const { Marker, Popup } = RL;
    const [position, setPosition] = useState<[number, number]>([lat, lng]);

    useEffect(() => {
        setPosition([lat, lng]);
    }, [lat, lng]);

    const eventHandlers = {
        dragend: () => {
            const marker = markerRef.current;
            if (marker && onLocationChange) {
                const latlng = marker.getLatLng();
                setPosition([latlng.lat, latlng.lng]);
                onLocationChange(latlng.lat, latlng.lng);
            }
        },
    };

    const markerRef = React.useRef<L.Marker>(null);

    return (
        <Marker
            ref={markerRef}
            position={position}
            draggable={!!onLocationChange}
            eventHandlers={eventHandlers}
        >
            {(propertyName || address) && (
                <Popup>
                    <div style={{ textAlign: 'center', minWidth: '200px' }}>
                        {propertyName && (
                            <h4 style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>
                                {propertyName}
                            </h4>
                        )}
                        {address && (
                            <p style={{ margin: '0', color: '#666', fontSize: '14px', lineHeight: '1.4' }}>
                                {address}
                            </p>
                        )}
                        <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: '12px' }}>
                            {position[0].toFixed(6)}, {position[1].toFixed(6)}
                        </p>
                    </div>
                </Popup>
            )}
        </Marker>
    );
};

// Component untuk static marker
const StaticMarker: React.FC<{
    lat: number;
    lng: number;
    propertyName?: string;
    address?: string;
}> = ({ lat, lng, propertyName, address }) => {
    if (!RL) return null;
    const { Marker, Popup } = RL;
    return (
        <Marker position={[lat, lng]}>
            {(propertyName || address) && (
                <Popup>
                    <div style={{ textAlign: 'center', minWidth: '200px' }}>
                        {propertyName && (
                            <h4 style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>
                                {propertyName}
                            </h4>
                        )}
                        {address && (
                            <p style={{ margin: '0', color: '#666', fontSize: '14px', lineHeight: '1.4' }}>
                                {address}
                            </p>
                        )}
                        <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: '12px' }}>
                            {lat.toFixed(6)}, {lng.toFixed(6)}
                        </p>
                    </div>
                </Popup>
            )}
        </Marker>
    );
};

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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Prevent rendering on server (SSR) atau sebelum Leaflet siap
    if (typeof window === 'undefined' || !RL || !L) {
        return null;
    }

    // Validasi koordinat
    const isValidCoordinate = (coord: number) => {
        return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
    };

    const isValidLat = isValidCoordinate(lat) && lat >= -90 && lat <= 90;
    const isValidLng = isValidCoordinate(lng) && lng >= -180 && lng <= 180;

    useEffect(() => {
        // Simulasi loading untuk memastikan map container siap
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    // Jika koordinat tidak valid, tampilkan pesan error
    if (!isValidLat || !isValidLng) {
        return (
            <div
                style={{ height: '100%', width: '100%' }}
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

    // Tampilkan loading state
    if (isLoading) {
        return (
            <div
                style={{ height: '100%', width: '100%' }}
                className={`rounded-lg border bg-gray-100 flex items-center justify-center ${className}`}
            >
                <div className="text-center text-gray-500 p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Memuat peta...</p>
                </div>
            </div>
        );
    }

    // Tampilkan error state
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
                            setTimeout(() => setIsLoading(false), 100);
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
            style={{ height, width: '100%' }}
            className={`rounded-lg border overflow-hidden ${className}`}
        >
            {/** MapContainer dkk diambil dari react-leaflet yang sudah di-require di client */}
            {(() => {
                const { MapContainer, TileLayer } = RL!;
                return (
                    <MapContainer
                center={[lat, lng]}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                attributionControl={true}
                >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapUpdater lat={lat} lng={lng} zoom={zoom} />

                        {draggable ? (
                            <DraggableMarker
                                lat={lat}
                                lng={lng}
                                propertyName={propertyName}
                                address={address}
                                onLocationChange={onLocationChange}
                            />
                        ) : (
                            <StaticMarker
                                lat={lat}
                                lng={lng}
                                propertyName={propertyName}
                                address={address}
                            />
                        )}
                    </MapContainer>
                );
            })()}
        </div>
    );
};