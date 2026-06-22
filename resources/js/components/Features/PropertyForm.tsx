import React, { useState, useCallback, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Map } from '@/components/ui/map';
import TextFormatMarkdown from '@/components/text-mark-down';
import MediaUpload from '@/components/MediaUpload';
import FileUpload from '@/components/ui/file-upload';
import type { Amenity, Property, PropertyMedia } from '@/types';
import {
    Building2, Save, Users, DollarSign, Clock, Star, Info,
    MapPin, Calendar, Plus, Trash2, RefreshCcw, ExternalLink,
    AlertCircle, ImageIcon, Pencil
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Owner {
    id: number;
    name: string;
    email: string;
}

export interface PropertyFormData {
    name: string;
    type: 'homestay' | 'villa' | 'apartment' | 'hotel';
    description: string;
    address: string;
    location: 'selatan' | 'utara';
    lat: number | null;
    lng: number | null;
    maps_link: string;
    tiktok_video_url: string;
    capacity: number;
    capacity_max: number;
    bedroom_count: number;
    bathroom_count: number;
    base_rate: number;
    weekend_premium_percent: number;
    weekend_premium_type: 'percentage' | 'fixed';
    weekend_premium_fixed: number;
    cleaning_fee: number;
    extra_bed_rate: number;
    status: 'active' | 'inactive' | 'maintenance';
    house_rules: string;
    check_in_time: string;
    check_out_time: string;
    min_stay_weekday: number;
    min_stay_weekend: number;
    min_stay_peak: number;
    is_featured: boolean;
    seo_title: string;
    seo_description: string;
    amenities: number[];
    owner_id?: string;
    current_keybox_code: string;
    checkin_instructions: {
        welcome: string;
        keybox_location: string;
        keybox_code: string;
        checkin_time: string;
        emergency_contact: string;
        additional_info: string[];
    };
    ical_import_urls: string[];
    ical_export_token: string;
    files?: File[];
}

export interface PropertyFormProps {
    mode: 'create' | 'edit';
    data: PropertyFormData;
    setData: (key: any, value?: any) => void;
    errors: Partial<Record<string, string>>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    amenities: Amenity[];
    owners?: Owner[];
    property?: Property & { media?: PropertyMedia[] };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INDONESIAN_CITIES: Record<string, { lat: number; lng: number; name: string }> = {
    'jakarta': { lat: -6.2088, lng: 106.8456, name: 'Jakarta' },
    'yogya': { lat: -7.7972, lng: 110.3688, name: 'Yogyakarta' },
    'jogja': { lat: -7.7972, lng: 110.3688, name: 'Yogyakarta' },
    'yogyakarta': { lat: -7.7972, lng: 110.3688, name: 'Yogyakarta' },
    'bandung': { lat: -6.9175, lng: 107.6191, name: 'Bandung' },
    'surabaya': { lat: -7.2575, lng: 112.7521, name: 'Surabaya' },
    'bali': { lat: -8.6705, lng: 115.2126, name: 'Bali' },
    'denpasar': { lat: -8.6705, lng: 115.2126, name: 'Denpasar' },
    'ubud': { lat: -8.5069, lng: 115.2624, name: 'Ubud' },
    'canggu': { lat: -8.6482, lng: 115.1386, name: 'Canggu' },
    'seminyak': { lat: -8.6913, lng: 115.1735, name: 'Seminyak' },
    'kuta': { lat: -8.7203, lng: 115.1677, name: 'Kuta' },
    'sanur': { lat: -8.6872, lng: 115.2620, name: 'Sanur' },
    'lombok': { lat: -8.6500, lng: 116.3244, name: 'Lombok' },
    'medan': { lat: 3.5952, lng: 98.6722, name: 'Medan' },
    'palembang': { lat: -2.9761, lng: 104.7754, name: 'Palembang' },
    'makassar': { lat: -5.1477, lng: 119.4327, name: 'Makassar' },
    'semarang': { lat: -6.9661, lng: 110.4203, name: 'Semarang' },
    'malang': { lat: -7.9797, lng: 112.6304, name: 'Malang' },
};

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active', color: 'text-green-600' },
    { value: 'inactive', label: 'Inactive', color: 'text-gray-600' },
    { value: 'maintenance', label: 'Maintenance', color: 'text-yellow-600' },
];

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// ─── Component ───────────────────────────────────────────────────────────────

export default function PropertyForm({
    mode,
    data,
    setData,
    errors,
    processing,
    onSubmit,
    amenities,
    owners,
    property,
}: PropertyFormProps) {
    const isEdit = mode === 'edit';
    const [showMap, setShowMap] = useState(false);
    const [mapCenter, setMapCenter] = useState({
        lat: data.lat || -6.2088,
        lng: data.lng || 106.8456,
    });
    const [syncing, setSyncing] = useState(false);
    const [editingMediaId, setEditingMediaId] = useState<number | null>(null);

    // Auto-sync capacity_max >= capacity
    useEffect(() => {
        if (data.capacity > data.capacity_max) {
            setData('capacity_max', data.capacity);
        }
    }, [data.capacity]);

    const handleLocationChange = useCallback((lat: number, lng: number) => {
        setData((prev: any) => ({ ...prev, lat, lng }));
        setMapCenter({ lat, lng });
    }, [setData]);

    const handleAddressChange = (address: string) => {
        setData('address', address);
        const lower = address.toLowerCase();
        for (const [key, city] of Object.entries(INDONESIAN_CITIES)) {
            if (lower.includes(key)) {
                setMapCenter({ lat: city.lat, lng: city.lng });
                break;
            }
        }
    };

    const handleAmenityToggle = (amenityId: number, checked: boolean) => {
        setData('amenities',
            checked
                ? [...data.amenities, amenityId]
                : data.amenities.filter((id: number) => id !== amenityId)
        );
    };

    const handleSyncICal = () => {
        if (!property || !data.ical_import_urls.some(u => u)) return;
        setSyncing(true);
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/admin/properties/${property.slug}/sync-ical`;
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = '_token';
            input.value = token;
            form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
    };

    // Group amenities by category
    const amenityCategories = amenities.reduce((acc, amenity) => {
        const cat = amenity.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(amenity);
        return acc;
    }, {} as Record<string, Amenity[]>);

    const mediaItems = property?.media || [];

    // ─── Field helper ────────────────────────────────────────────────────────

    const fieldError = (name: string) =>
        errors[name] ? <p className="text-sm text-red-600 mt-1">{errors[name]}</p> : null;

    const inputCls = (name: string) =>
        errors[name] ? 'border-red-500' : '';

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {/* Error summary */}
            {Object.keys(errors).length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <span className="font-medium">Please fix the following errors:</span>
                        <ul className="text-sm mt-1 space-y-0.5">
                            {Object.entries(errors).map(([field, msg]) => (
                                <li key={field}>• {String(msg)}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* ══════════ Main Column ══════════ */}
                <div className="lg:col-span-2 space-y-6">

                    {/* ── Basic Info ────────────────────────────────────── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="h-4 w-4" /> Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Property Name *</Label>
                                    <Input value={data.name} onChange={e => setData('name', e.target.value)}
                                        placeholder="Villa Sunset Paradise" className={inputCls('name')} />
                                    {fieldError('name')}
                                </div>
                                <div>
                                    <Label>Type *</Label>
                                    <Select value={data.type} onValueChange={v => setData('type', v as any)}>
                                        <SelectTrigger className={inputCls('type')}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="homestay">Homestay</SelectItem>
                                            <SelectItem value="villa">Villa</SelectItem>
                                            <SelectItem value="apartment">Apartment</SelectItem>
                                            <SelectItem value="hotel">Hotel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {fieldError('type')}
                                </div>
                                {owners && (
                                    <div>
                                        <Label>Owner *</Label>
                                        <Select value={data.owner_id} onValueChange={v => setData('owner_id', v)}>
                                            <SelectTrigger className={inputCls('owner_id')}><SelectValue placeholder="Select owner..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">Auto-assign</SelectItem>
                                                {owners.map(o => (
                                                    <SelectItem key={o.id} value={o.id.toString()}>{o.name} ({o.email})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldError('owner_id')}
                                    </div>
                                )}
                                <div>
                                    <Label>Status *</Label>
                                    <Select value={data.status} onValueChange={v => setData('status', v as any)}>
                                        <SelectTrigger className={inputCls('status')}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map(s => (
                                                <SelectItem key={s.value} value={s.value}>
                                                    <span className={s.color}>{s.label}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldError('status')}
                                </div>
                            </div>

                            <div>
                                <Label>Description *</Label>
                                <Textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                    rows={3} placeholder="Describe your property..." className={inputCls('description')} />
                                {fieldError('description')}
                                {data.description && <TextFormatMarkdown text={data.description} />}
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch checked={data.is_featured} onCheckedChange={c => setData('is_featured', c)} />
                                <Label className="flex items-center gap-1.5 cursor-pointer">
                                    <Star className="h-3.5 w-3.5" /> Featured Property
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Location ──────────────────────────────────────── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MapPin className="h-4 w-4" /> Location
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Address *</Label>
                                <Textarea value={data.address} onChange={e => handleAddressChange(e.target.value)}
                                    rows={2} placeholder="Jl. Raya Villa No. 123, Canggu, Bali" className={inputCls('address')} />
                                {fieldError('address')}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Area *</Label>
                                    <div className="flex gap-4 mt-1.5">
                                        {['selatan', 'utara'].map(loc => (
                                            <label key={loc} className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="location" value={loc}
                                                    checked={data.location === loc}
                                                    onChange={e => setData('location', e.target.value as 'selatan' | 'utara')}
                                                    className="h-4 w-4" />
                                                <span className="text-sm">🏡 {loc.toUpperCase()}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {fieldError('location')}
                                </div>
                                <div>
                                    <Label>Maps Link</Label>
                                    <Input value={data.maps_link} onChange={e => setData('maps_link', e.target.value)}
                                        placeholder="https://maps.app.goo.gl/..." />
                                    {fieldError('maps_link')}
                                </div>
                            </div>

                            <div>
                                <Label>TikTok Video URL</Label>
                                <Input value={data.tiktok_video_url} onChange={e => setData('tiktok_video_url', e.target.value)}
                                    placeholder="https://www.tiktok.com/@username/video/..." />
                                {fieldError('tiktok_video_url')}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label>Latitude</Label>
                                    <Input type="number" step="any" value={data.lat ?? ''}
                                        onChange={e => setData('lat', e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="-8.6705" className={inputCls('lat')} />
                                    {fieldError('lat')}
                                </div>
                                <div>
                                    <Label>Longitude</Label>
                                    <Input type="number" step="any" value={data.lng ?? ''}
                                        onChange={e => setData('lng', e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="115.2126" className={inputCls('lng')} />
                                    {fieldError('lng')}
                                </div>
                                <div className="flex items-end">
                                    <Button type="button" variant="outline" className="w-full" onClick={() => setShowMap(!showMap)}>
                                        <MapPin className="h-4 w-4 mr-1" /> {showMap ? 'Hide' : 'Map'}
                                    </Button>
                                </div>
                            </div>

                            {showMap && (
                                <div>
                                    <Map lat={data.lat || mapCenter.lat} lng={data.lng || mapCenter.lng}
                                        height="250px" draggable onLocationChange={handleLocationChange}
                                        propertyName={data.name || 'New Property'} address={data.address} />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        <Info className="h-3 w-3 inline mr-1" /> Drag marker to set location
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Capacity & Pricing (combined) ─────────────────── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="h-4 w-4" /> Capacity & Pricing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-4 gap-3">
                                <div>
                                    <Label>Capacity *</Label>
                                    <Input type="number" min={1} value={data.capacity}
                                        onChange={e => setData('capacity', parseInt(e.target.value) || 1)}
                                        className={inputCls('capacity')} />
                                    {fieldError('capacity')}
                                </div>
                                <div>
                                    <Label>Max Capacity *</Label>
                                    <Input type="number" min={data.capacity} value={data.capacity_max}
                                        onChange={e => setData('capacity_max', parseInt(e.target.value) || data.capacity)}
                                        className={inputCls('capacity_max')} />
                                    {fieldError('capacity_max')}
                                </div>
                                <div>
                                    <Label>Bedrooms *</Label>
                                    <Input type="number" min={1} value={data.bedroom_count}
                                        onChange={e => setData('bedroom_count', parseInt(e.target.value) || 1)}
                                        className={inputCls('bedroom_count')} />
                                    {fieldError('bedroom_count')}
                                </div>
                                <div>
                                    <Label>Bathrooms *</Label>
                                    <Input type="number" min={1} value={data.bathroom_count}
                                        onChange={e => setData('bathroom_count', parseInt(e.target.value) || 1)}
                                        className={inputCls('bathroom_count')} />
                                    {fieldError('bathroom_count')}
                                </div>
                            </div>

                            <Separator />

                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <Label>Base Rate (IDR/night) *</Label>
                                    <Input type="number" min={0} value={data.base_rate}
                                        onChange={e => setData('base_rate', parseInt(e.target.value) || 0)}
                                        className={inputCls('base_rate')} />
                                    {fieldError('base_rate')}
                                </div>
                                <div>
                                    <Label>Weekend Premium Type</Label>
                                    <Select value={data.weekend_premium_type} onValueChange={v => setData('weekend_premium_type', v as 'percentage' | 'fixed')}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="fixed">Fixed (IDR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {data.weekend_premium_type === 'percentage' ? (
                                    <div>
                                        <Label>Weekend Premium (%)</Label>
                                        <Input type="number" min={0} max={100} value={data.weekend_premium_percent}
                                            onChange={e => setData('weekend_premium_percent', parseInt(e.target.value) || 0)} />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Weekend: {formatCurrency(data.base_rate * (1 + data.weekend_premium_percent / 100))}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <Label>Weekend Premium Fixed (IDR)</Label>
                                        <Input type="number" min={0} value={data.weekend_premium_fixed}
                                            onChange={e => setData('weekend_premium_fixed', parseInt(e.target.value) || 0)} />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Weekend: {formatCurrency((data.base_rate || 0) + (data.weekend_premium_fixed || 0))}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <Label>Extra Bed Rate (IDR/night)</Label>
                                    <Input type="number" min={0} value={data.extra_bed_rate}
                                        onChange={e => setData('extra_bed_rate', parseInt(e.target.value) || 0)}
                                        className={inputCls('extra_bed_rate')} />
                                    {fieldError('extra_bed_rate')}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Booking Rules ─────────────────────────────────── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Calendar className="h-4 w-4" /> Booking Rules
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <Label>Check-in Time *</Label>
                                    <Input type="time" value={data.check_in_time}
                                        onChange={e => setData('check_in_time', e.target.value)} className={inputCls('check_in_time')} />
                                    {fieldError('check_in_time')}
                                </div>
                                <div>
                                    <Label>Check-out Time *</Label>
                                    <Input type="time" value={data.check_out_time}
                                        onChange={e => setData('check_out_time', e.target.value)} className={inputCls('check_out_time')} />
                                    {fieldError('check_out_time')}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label>Min Weekday</Label>
                                    <Input type="number" min={1} value={data.min_stay_weekday}
                                        onChange={e => setData('min_stay_weekday', parseInt(e.target.value) || 1)} />
                                </div>
                                <div>
                                    <Label>Min Weekend</Label>
                                    <Input type="number" min={1} value={data.min_stay_weekend}
                                        onChange={e => setData('min_stay_weekend', parseInt(e.target.value) || 1)} />
                                </div>
                                <div>
                                    <Label>Min Peak</Label>
                                    <Input type="number" min={1} value={data.min_stay_peak}
                                        onChange={e => setData('min_stay_peak', parseInt(e.target.value) || 1)} />
                                </div>
                            </div>

                            <div>
                                <Label>House Rules</Label>
                                <Textarea value={data.house_rules} onChange={e => setData('house_rules', e.target.value)}
                                    rows={3} placeholder="No smoking, No pets..." className={inputCls('house_rules')} />
                                {fieldError('house_rules')}
                                {data.house_rules && <TextFormatMarkdown text={data.house_rules} />}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Keybox & Check-in Instructions ────────────────── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Info className="h-4 w-4" /> Check-in Setup
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <Label>Keybox Code (3 digits)</Label>
                                    <Input maxLength={3} value={data.current_keybox_code}
                                        onChange={e => setData('current_keybox_code', e.target.value.replace(/\D/g, '').slice(0, 3))}
                                        placeholder="123" className={inputCls('current_keybox_code')} />
                                    {fieldError('current_keybox_code')}
                                </div>
                                <div>
                                    <Label>Welcome Message</Label>
                                    <Input value={data.checkin_instructions.welcome}
                                        onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, welcome: e.target.value })}
                                        placeholder="Selamat datang!" />
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <Label>Keybox Location</Label>
                                    <Input value={data.checkin_instructions.keybox_location}
                                        onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, keybox_location: e.target.value })}
                                        placeholder="Keybox terletak di depan pintu" />
                                </div>
                                <div>
                                    <Label>Keybox Code Template</Label>
                                    <Input value={data.checkin_instructions.keybox_code}
                                        onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, keybox_code: e.target.value })}
                                        placeholder="Kode keybox: {{keybox_code}}" />
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <Label>Check-in Time Info</Label>
                                    <Input value={data.checkin_instructions.checkin_time}
                                        onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, checkin_time: e.target.value })}
                                        placeholder="Check-in: 14:00 - 22:00" />
                                </div>
                                <div>
                                    <Label>Emergency Contact</Label>
                                    <Input value={data.checkin_instructions.emergency_contact}
                                        onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, emergency_contact: e.target.value })}
                                        placeholder="0811-2500-082" />
                                </div>
                            </div>

                            <div>
                                <Label>Additional Info</Label>
                                {(data.checkin_instructions.additional_info || []).map((info, i) => (
                                    <div key={i} className="flex gap-2 mt-1.5">
                                        <Input value={info} placeholder={`Info ${i + 1}`}
                                            onChange={e => {
                                                const arr = [...data.checkin_instructions.additional_info];
                                                arr[i] = e.target.value;
                                                setData('checkin_instructions', { ...data.checkin_instructions, additional_info: arr });
                                            }} />
                                        <Button type="button" variant="ghost" size="icon"
                                            className="shrink-0 text-red-500 hover:text-red-700"
                                            onClick={() => {
                                                const arr = data.checkin_instructions.additional_info.filter((_, idx) => idx !== i);
                                                setData('checkin_instructions', { ...data.checkin_instructions, additional_info: arr });
                                            }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" className="mt-2"
                                    onClick={() => setData('checkin_instructions', {
                                        ...data.checkin_instructions,
                                        additional_info: [...(data.checkin_instructions.additional_info || []), '']
                                    })}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Info
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Placeholders: <code className="bg-muted px-1 rounded">{'{{keybox_code}}'}</code> <code className="bg-muted px-1 rounded">{'{{property_name}}'}</code> <code className="bg-muted px-1 rounded">{'{{address}}'}</code>
                            </p>
                        </CardContent>
                    </Card>

                    {/* ── iCal Synchronization ─────────────────────────── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Calendar className="h-4 w-4" /> iCal Sync (OTA)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Import URLs (Airbnb / Booking.com / Agoda)</Label>
                                <p className="text-xs text-muted-foreground mb-2">Paste iCal export links from OTA platforms.</p>
                                {data.ical_import_urls.map((url, i) => (
                                    <div key={i} className="flex gap-2 mt-1.5">
                                        <div className="relative flex-1">
                                            <Input value={url || ''}
                                                onChange={e => {
                                                    const arr = [...data.ical_import_urls];
                                                    arr[i] = e.target.value;
                                                    setData('ical_import_urls', arr);
                                                }}
                                                placeholder="https://www.airbnb.com/calendar/ical/..."
                                                className={errors[`ical_import_urls.${i}`] ? 'border-red-500 pr-16' : 'pr-16'} />
                                            {(url || '').includes('airbnb') && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#FF5A5F]">Airbnb</span>}
                                            {(url || '').includes('booking.com') && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#003580]">Booking</span>}
                                        </div>
                                        <Button type="button" variant="ghost" size="icon"
                                            className="shrink-0 text-red-500"
                                            onClick={() => {
                                                const arr = [...data.ical_import_urls];
                                                arr.splice(i, 1);
                                                setData('ical_import_urls', arr.length > 0 ? arr : ['']);
                                            }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <Button type="button" variant="outline" size="sm"
                                        onClick={() => setData('ical_import_urls', [...data.ical_import_urls, ''])}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Feed
                                    </Button>
                                    {isEdit && (
                                        <Button type="button" variant="secondary" size="sm"
                                            onClick={handleSyncICal}
                                            disabled={syncing || data.ical_import_urls.every(u => !u)}>
                                            <RefreshCcw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                                            {syncing ? 'Syncing...' : 'Sync Now'}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Export feed (edit mode only) */}
                            {isEdit && property && data.ical_export_token && (
                                <>
                                    <Separator />
                                    <div className="bg-muted/30 p-3 rounded-lg border border-dashed space-y-2">
                                        <Label className="text-sm">Your iCal Export Feed</Label>
                                        <p className="text-xs text-muted-foreground">Copy to Airbnb/Booking.com to sync availability.</p>
                                        <div className="flex items-center gap-2 p-2 bg-background border rounded text-xs">
                                            <code className="font-mono truncate flex-1">
                                                {window.location.origin}/property/{property.slug}/ical/{data.ical_export_token}
                                            </code>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
                                                onClick={() => window.open(`${window.location.origin}/property/${property.slug}/ical/${data.ical_export_token}`, '_blank')}>
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
                                                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/property/${property.slug}/ical/${data.ical_export_token}`)}>
                                                <Save className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Media Gallery (edit mode) ─────────────────────── */}
                    {isEdit && property && (
                        <div className="mt-6">
                            <MediaUpload
                                propertySlug={property.slug}
                                initialMedia={property.media || []}
                            />
                        </div>
                    )}

                    {/* ── Media Gallery (create mode) ─────────────────────── */}
                    {!isEdit && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ImageIcon className="h-4 w-4" /> Upload Photos & Videos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FileUpload
                                    config={{
                                        maxFiles: 50,
                                        maxFileSize: 100 * 1024 * 1024, // 100MB
                                        acceptedFileTypes: [
                                            'image/jpeg',
                                            'image/png',
                                            'image/jpg',
                                            'image/gif',
                                            'image/webp',
                                            'video/mp4',
                                            'video/mov',
                                            'video/avi',
                                            'video/webm'
                                        ],
                                        acceptedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm'],
                                        showPreview: true,
                                        allowMultiple: true,
                                        showProgress: false,
                                        dragAndDrop: true,
                                        showFileDetails: true,
                                        showMetadataForm: false,
                                        required: false
                                    }}
                                    onFilesChange={(files) => {
                                        setData('files', files.map(f => f.file));
                                    }}
                                    error={errors.files}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* ── SEO ───────────────────────────────────────────── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">SEO Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label>SEO Title</Label>
                                <Input value={data.seo_title} onChange={e => setData('seo_title', e.target.value)}
                                    placeholder="Best Villa in Bali - Villa Sunset Paradise" className={inputCls('seo_title')} />
                                {fieldError('seo_title')}
                            </div>
                            <div>
                                <Label>SEO Description</Label>
                                <Textarea value={data.seo_description} onChange={e => setData('seo_description', e.target.value)}
                                    rows={2} placeholder="Experience luxury at..." className={inputCls('seo_description')} />
                                {fieldError('seo_description')}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ══════════ Sidebar ══════════ */}
                <div className="space-y-6">

                    {/* ── Amenities ─────────────────────────────────────── */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Amenities</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-80 overflow-y-auto space-y-3">
                            {Object.entries(amenityCategories).map(([cat, items]) => (
                                <div key={cat}>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                                        {cat.replace('_', ' ')}
                                    </p>
                                    <div className="space-y-1">
                                        {items.map(amenity => (
                                            <label key={amenity.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                                                <Checkbox
                                                    checked={Array.isArray(data.amenities) && data.amenities.includes(amenity.id)}
                                                    onCheckedChange={c => handleAmenityToggle(amenity.id, c as boolean)}
                                                />
                                                <span className="text-sm">{amenity.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* ── Actions ───────────────────────────────────────── */}
                    <Card>
                        <CardContent className="pt-6 space-y-3">
                            <Button type="submit" disabled={processing} className="w-full">
                                <Save className="h-4 w-4 mr-2" />
                                {processing
                                    ? (isEdit ? 'Updating...' : 'Creating...')
                                    : (isEdit ? 'Update Property' : 'Create Property')
                                }
                            </Button>
                            <Button type="button" variant="outline" className="w-full" asChild>
                                <Link href={isEdit && property ? `/admin/properties/${property.slug}` : '/admin/properties'}>
                                    Cancel
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </form>
    );
}
