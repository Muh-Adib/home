import React, { useEffect, useState, useMemo } from 'react';
import { Link } from '@inertiajs/react';
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
import { MapPin, Users, DollarSign, Landmark, GraduationCap, Building2, Train } from 'lucide-react';

// Fix for default markers in React Leaflet (hanya ketika Leaflet sudah tersedia)
if (typeof window !== 'undefined' && L) {
    delete (L!.Icon.Default.prototype as any)._getIconUrl;
    L!.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

// Create custom icon for properties with hover effect
const createPropertyIcon = () => {
    return L.divIcon({
        className: 'custom-property-marker',
        html: `
            <div class="property-marker-wrapper" style="
                position: relative;
                cursor: pointer;
                transition: transform 0.2s ease;
            ">
                <div style="
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    width: 32px;
                    height: 32px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                ">
                    <div style="
                        transform: rotate(45deg);
                        color: white;
                        font-size: 16px;
                        font-weight: bold;
                    ">🏠</div>
                </div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

// Create custom icon for landmarks and facilities with hover effect
const createLandmarkIcon = (type: 'landmark' | 'university' | 'supermarket' | 'pharmacy' | 'station' | 'mosque' | 'church' = 'landmark') => {
    const iconConfig: Record<string, { bg: string; emoji: string; size: number }> = {
        university: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', emoji: '🎓', size: 36 },
        landmark: { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', emoji: '📍', size: 36 },
        supermarket: { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', emoji: '🛒', size: 32 },
        pharmacy: { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', emoji: '💊', size: 32 },
        station: { bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', emoji: '🚉', size: 32 },
        mosque: { bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', emoji: '🕌', size: 32 },
        church: { bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', emoji: '⛪', size: 32 },
    };

    const config = iconConfig[type] || iconConfig.landmark;

    return L.divIcon({
        className: 'custom-landmark-marker',
        html: `
            <div class="landmark-marker-wrapper" style="
                position: relative;
                cursor: pointer;
                transition: transform 0.2s ease;
            ">
                <div style="
                    background: ${config.bg};
                    width: ${config.size}px;
                    height: ${config.size}px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                ">
                    <div style="
                        color: white;
                        font-size: ${config.size === 36 ? '18px' : '16px'};
                    ">${config.emoji}</div>
                </div>
            </div>
        `,
        iconSize: [config.size, config.size],
        iconAnchor: [config.size / 2, config.size],
        popupAnchor: [0, -config.size],
    });
};

// Landmark data untuk Yogyakarta
const YOGYAKARTA_LANDMARKS = [
    // Landmark Ikonik
    {
        id: 'malioboro',
        name: 'Malioboro',
        type: 'landmark' as const,
        lat: -7.7934,
        lng: 110.3657,
        description: 'Jalan Malioboro - Pusat perbelanjaan dan wisata terkenal di Yogyakarta',
    },
    {
        id: 'tugu-jogja',
        name: 'Tugu Jogja',
        type: 'landmark' as const,
        lat: -7.7829,
        lng: 110.3671,
        description: 'Tugu Yogyakarta - Monumen ikonik di jantung kota Yogyakarta',
    },
    // Kampus
    {
        id: 'ugm',
        name: 'Universitas Gadjah Mada (UGM)',
        type: 'university' as const,
        lat: -7.770717,
        lng: 110.377724,
        description: 'Universitas Gadjah Mada - Perguruan tinggi negeri terkemuka',
    },
    {
        id: 'uii',
        name: 'Universitas Islam Indonesia (UII)',
        type: 'university' as const,
        lat: -7.7606,
        lng: 110.4081,
        description: 'Universitas Islam Indonesia - Kampus terpadu di Sleman',
    },
    {
        id: 'uii-atas',
        name: 'UII (Jakal Atas)',
        type: 'university' as const,
        lat: -7.687573094862437,
        lng: 110.41422734032639,
        description: 'UII - Kampus UII di Jalan Kaliurang KM 14.5, Sleman',
    },
    {
        id: 'uny',
        name: 'Universitas Negeri Yogyakarta (UNY)',
        type: 'university' as const,
        lat: -7.77360316251077,
        lng: 110.38625506480156,
        description: 'Universitas Negeri Yogyakarta - Kampus pendidikan terkemuka',
    },
    {
        id: 'uad',
        name: 'Universitas Ahmad Dahlan (UAD)',
        type: 'university' as const,
        lat: -7.798692199048697,
        lng: 110.383087119732,
        description: 'Universitas Ahmad Dahlan - Kampus di pusat kota',
    },
    {
        id: 'atmajaya',
        name: 'Universitas Atma Jaya Yogyakarta',
        type: 'university' as const,
        lat: -7.7831,
        lng: 110.3906,
        description: 'Universitas Atma Jaya Yogyakarta - Kampus swasta terkemuka',
    },
    {
        id: 'pgri',
        name: 'Universitas PGRI Yogyakarta',
        type: 'university' as const,
        lat: -7.8063274666027445,
        lng: 110.3406499900733,
        description: 'Universitas PGRI Yogyakarta - Kampus di pusat kota Yogyakarta',
    },
    // Stasiun
    {
        id: 'stasiun-tugu',
        name: 'Stasiun Tugu Yogyakarta',
        type: 'station' as const,
        lat: -7.7892,
        lng: 110.3631,
        description: 'Stasiun Tugu - Stasiun kereta api utama di Yogyakarta',
    },
    {
        id: 'stasiun-lempuyangan',
        name: 'Stasiun Lempuyangan',
        type: 'station' as const,
        lat: -7.790226224742601,
        lng: 110.37515302330576,
        description: 'Stasiun Lempuyangan - Stasiun kereta api di Yogyakarta',
    }

];

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    lat: number;
    lng: number;
    base_rate: number;
    formatted_base_rate: string;
    capacity: number;
    capacity_max: number;
    image_url?: string;
}

interface PropertiesMapProps {
    height?: string;
    className?: string;
    center?: [number, number];
    zoom?: number;
    showControls?: boolean;
}

// Component untuk update map bounds ketika properties berubah
const MapBoundsUpdater: React.FC<{ properties: Property[]; includeLandmarks?: boolean }> = ({ properties, includeLandmarks = true }) => {
    if (!RL || !L) return null;
    const { useMap } = RL;
    const map = useMap();

    useEffect(() => {
        const allPoints: [number, number][] = properties.map(prop => [prop.lat, prop.lng]);

        // Include landmarks in bounds calculation
        if (includeLandmarks) {
            YOGYAKARTA_LANDMARKS.forEach(landmark => {
                allPoints.push([landmark.lat, landmark.lng]);
            });
        }

        if (allPoints.length === 0) return;

        // Calculate bounds dari semua points
        const bounds = L.latLngBounds(allPoints);

        // Fit map to bounds dengan padding
        map.fitBounds(bounds, {
            padding: [80, 80],
            maxZoom: 14,
        });
    }, [properties, includeLandmarks, map]);

    return null;
};

export const PropertiesMap: React.FC<PropertiesMapProps> = ({
    height = '500px',
    className = '',
    center,
    zoom = 13,
    showControls = true,
}) => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Prevent rendering pada server atau sebelum Leaflet/react-leaflet siap
    if (typeof window === 'undefined' || !RL || !L) {
        return null;
    }

    // Ambil komponen dari react-leaflet yang sudah di-require di client
    const { MapContainer, TileLayer, Marker, Popup } = RL;

    // Inject custom CSS for popup styling and hover effects
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .custom-popup .leaflet-popup-content-wrapper {
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                padding: 0;
                overflow: hidden;
            }
            .custom-popup .leaflet-popup-content {
                margin: 0;
                padding: 16px;
            }
            .custom-popup .leaflet-popup-tip {
                background: white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .custom-property-marker {
                background: transparent !important;
                border: none !important;
            }
            .custom-landmark-marker {
                background: transparent !important;
                border: none !important;
            }
            .property-marker-wrapper:hover,
            .landmark-marker-wrapper:hover {
                transform: scale(1.15) translateY(-3px);
                z-index: 1000 !important;
            }
            .property-marker-wrapper:hover > div {
                box-shadow: 0 4px 20px rgba(59, 130, 246, 0.6);
                transform: rotate(-45deg) scale(1.1);
            }
            .landmark-marker-wrapper:hover > div {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                transform: scale(1.15);
            }
            .leaflet-marker-icon {
                transition: transform 0.2s ease;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Calculate default center dari properties atau use provided center
    const mapCenter = useMemo(() => {
        if (center) return center;

        if (properties.length > 0) {
            // Calculate center dari semua properties
            const avgLat = properties.reduce((sum, p) => sum + p.lat, 0) / properties.length;
            const avgLng = properties.reduce((sum, p) => sum + p.lng, 0) / properties.length;
            return [avgLat, avgLng] as [number, number];
        }

        // Default center: Yogyakarta
        return [-7.7972, 110.3688] as [number, number];
    }, [properties, center]);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch('/api/properties/map-coordinates');
                const data = await response.json();

                if (data.success && data.properties) {
                    setProperties(data.properties);
                } else {
                    setError('Failed to load properties');
                }
            } catch (err) {
                console.error('Error fetching properties:', err);
                setError('Failed to load properties map');
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, []);

    // Loading state
    if (loading) {
        return (
            <div
                style={{ height, width: '100%' }}
                className={`rounded-lg border bg-gray-100 flex items-center justify-center ${className}`}
            >
                <div className="text-center text-gray-500 p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Memuat peta properti...</p>
                </div>
            </div>
        );
    }

    // Error state
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
                </div>
            </div>
        );
    }

    // No properties state
    if (properties.length === 0) {
        return (
            <div
                style={{ height, width: '100%' }}
                className={`rounded-lg border bg-gray-100 flex items-center justify-center ${className}`}
            >
                <div className="text-center text-gray-500 p-4">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">Tidak ada properti tersedia</p>
                    <p className="text-sm text-gray-400 mt-1">Belum ada properti dengan koordinat yang valid</p>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{ height, width: '100%' }}
            className={`rounded-lg border-2 border-gray-200 overflow-hidden shadow-lg ${className}`}
        >
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={showControls}
                attributionControl={true}
                scrollWheelZoom={true}
                className="z-0"
            >
                {/* Clean map style - CartoDB Positron */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                />

                {/* Update bounds ketika properties berubah */}
                <MapBoundsUpdater properties={properties} />

                {/* Render landmark markers */}
                {YOGYAKARTA_LANDMARKS.map((landmark) => (
                    <Marker
                        key={landmark.id}
                        position={[landmark.lat, landmark.lng]}
                        icon={createLandmarkIcon(landmark.type)}
                    >
                        <Popup className="custom-popup">
                            <div className="min-w-[200px] max-w-[280px]">
                                <div className="flex items-center gap-2 mb-2">
                                    {landmark.type === 'university' && <GraduationCap className="h-5 w-5 text-amber-600" />}
                                    {landmark.type === 'landmark' && <Landmark className="h-5 w-5 text-red-600" />}
                                    {landmark.type === 'station' && <Train className="h-5 w-5 text-indigo-600" />}
                                    <h3 className="font-bold text-base text-gray-900">
                                        {landmark.name}
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {landmark.description}
                                </p>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500">
                                        📍 {landmark.lat.toFixed(4)}, {landmark.lng.toFixed(4)}
                                    </p>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Render markers untuk setiap property */}
                {properties.map((property) => (
                    <Marker
                        key={property.id}
                        position={[property.lat, property.lng]}
                        icon={createPropertyIcon()}
                    >
                        <Popup className="custom-popup" maxWidth={320}>
                            <div className="min-w-[250px] max-w-[300px]">
                                {property.image_url && (
                                    <img
                                        src={property.image_url}
                                        alt={property.name}
                                        className="w-full h-36 object-cover rounded-lg mb-3 shadow-sm"
                                    />
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight">
                                        {property.name}
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-3 flex items-start gap-1.5">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                                    <span className="leading-relaxed">{property.address}</span>
                                </p>
                                <div className="flex items-center gap-4 text-sm mb-4 pb-3 border-b border-gray-200">
                                    <span className="flex items-center gap-1.5 text-gray-700">
                                        <Users className="h-4 w-4 text-gray-500" />
                                        <span className="font-medium">{property.capacity_max} tamu</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 font-bold text-blue-600">
                                        <DollarSign className="h-4 w-4" />
                                        <span>{property.formatted_base_rate}/malam</span>
                                    </span>
                                </div>
                                <Link
                                    href={`/properties/${property.slug}`}
                                    className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                    Lihat Detail →
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};


