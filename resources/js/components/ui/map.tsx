import React, { useEffect, useState, useRef } from 'react';

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
const MapUpdater: React.FC<{ lat: number; lng: number; zoom: number; RL: any }> = ({ lat, lng, zoom, RL }) => {
    const { useMap } = RL;
    const map = useMap();

    useEffect(() => {
        if (map) {
            map.setView([lat, lng], zoom);
        }
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
    RL: any;
    L: any;
}> = ({ lat, lng, propertyName, address, onLocationChange, RL, L }) => {
    const { Marker, Popup } = RL;
    const [position, setPosition] = useState<[number, number]>([lat, lng]);
    const markerRef = useRef<any>(null);

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
    RL: any;
}> = ({ lat, lng, propertyName, address, RL }) => {
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
    const [modules, setModules] = useState<{ L: any; RL: any } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Validasi koordinat
    const isValidCoordinate = (coord: number) => {
        return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
    };

    const isValidLat = isValidCoordinate(lat) && lat >= -90 && lat <= 90;
    const isValidLng = isValidCoordinate(lng) && lng >= -180 && lng <= 180;

    useEffect(() => {
        let mounted = true;

        const loadModules = async () => {
            if (typeof window === 'undefined') return;
            try {
                const leafletModule = await import('leaflet');
                const reactLeafletModule = await import('react-leaflet');
                await import('leaflet/dist/leaflet.css');

                const L = leafletModule.default || leafletModule;
                const RL = reactLeafletModule;

                // Fix for default markers
                if (L.Icon && L.Icon.Default) {
                    delete (L.Icon.Default.prototype as any)._getIconUrl;
                    L.Icon.Default.mergeOptions({
                        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                    });
                }

                if (mounted) {
                    setModules({ L, RL });
                    setIsLoading(false);
                }
            } catch (err: any) {
                console.error("Failed to load map modules:", err);
                if (mounted) {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        };

        if (isValidLat && isValidLng) {
            loadModules();
        }

        return () => {
            mounted = false;
        };
    }, [isValidLat, isValidLng]);

    if (typeof window === 'undefined') {
        return null;
    }

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
    if (isLoading || !modules) {
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
                            setTimeout(() => window.location.reload(), 100);
                        }}
                        className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                    >
                        Muat Ulang Halaman
                    </button>
                </div>
            </div>
        );
    }

    const { MapContainer, TileLayer } = modules.RL;

    return (
        <div
            style={{ height, width: '100%' }}
            className={`rounded-lg border overflow-hidden ${className}`}
        >
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

                <MapUpdater lat={lat} lng={lng} zoom={zoom} RL={modules.RL} />

                {draggable ? (
                    <DraggableMarker
                        lat={lat}
                        lng={lng}
                        propertyName={propertyName}
                        address={address}
                        onLocationChange={onLocationChange}
                        RL={modules.RL}
                        L={modules.L}
                    />
                ) : (
                    <StaticMarker
                        lat={lat}
                        lng={lng}
                        propertyName={propertyName}
                        address={address}
                        RL={modules.RL}
                    />
                )}
            </MapContainer>
        </div>
    );
};