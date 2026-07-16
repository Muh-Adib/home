import React, { useState, useCallback, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
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
import { Badge } from '@/components/ui/badge';
import TextFormatMarkdown from '@/components/text-mark-down';
import MediaUpload from '@/components/MediaUpload';
import FileUpload from '@/components/ui/file-upload';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import type { Amenity, Property, PropertyMedia } from '@/types';
import {
    Building2, Save, Users, DollarSign, Clock, Star, Info,
    MapPin, Calendar, Plus, Trash2, RefreshCcw, ExternalLink,
    AlertCircle, ImageIcon, CreditCard, Wifi, Key
} from 'lucide-react';

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
        wifi_name?: string;
        wifi_password?: string;
        additional_info: string[];
    };
    ical_import_urls: string[];
    ical_export_token: string;
    files?: File[];
    ownership_model: 'owned' | 'rented' | 'partnership';
    initial_build_capital: number;
    lease_capital: number;
    monthly_rent_cost: number;
    monthly_mortgage_cost: number;
    mortgage_interest_monthly: number;
    owner_split_pct: number;
    investor_split_pct: number;
    bank_account_id?: number | string | null;
    payment_method_id?: number | string | null;
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
    bankAccounts?: any[];
    paymentMethods?: any[];
    property?: Property & { media?: PropertyMedia[] };
}

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

export default function PropertyForm({
    mode,
    data,
    setData,
    errors,
    processing,
    onSubmit,
    amenities,
    owners,
    bankAccounts = [],
    paymentMethods = [],
    property,
}: PropertyFormProps) {
    const { auth } = usePage<PageProps>().props;
    const authUser = auth?.user as any;
    const hasFinancialAccess = ['super_admin', 'property_manager', 'admin'].includes(authUser?.role);

    const isEdit = mode === 'edit';
    const [showMap, setShowMap] = useState(false);
    const [mapCenter, setMapCenter] = useState({
        lat: data.lat || -6.2088,
        lng: data.lng || 106.8456,
    });
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'rooms' | 'pricing' | 'media_amenities' | 'operations' | 'checkin'>('basic');

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

    // ─── Tab Configuration with validation tracking ──────────────────────────────
    const TABS = [
        { 
            value: 'basic', 
            label: 'Info Dasar', 
            icon: Building2, 
            fields: ['name', 'type', 'owner_id', 'status', 'description', 'bank_account_id'] 
        },
        { 
            value: 'location', 
            label: 'Lokasi & Peta', 
            icon: MapPin, 
            fields: ['address', 'location', 'maps_link', 'tiktok_video_url', 'lat', 'lng'] 
        },
        { 
            value: 'rooms', 
            label: 'Kamar & Tamu', 
            icon: Users, 
            fields: ['capacity', 'capacity_max', 'bedroom_count', 'bathroom_count'] 
        },
        ...(hasFinancialAccess ? [{ 
            value: 'pricing', 
            label: 'Keuangan & BEP', 
            icon: DollarSign, 
            fields: ['base_rate', 'weekend_premium_percent', 'weekend_premium_fixed', 'cleaning_fee', 'extra_bed_rate', 'ownership_model', 'initial_build_capital', 'lease_capital', 'monthly_rent_cost', 'monthly_mortgage_cost', 'mortgage_interest_monthly', 'owner_split_pct', 'investor_split_pct'] 
        }] : []),
        { 
            value: 'media_amenities', 
            label: 'Foto & Fasilitas', 
            icon: ImageIcon, 
            fields: ['amenities', 'files'] 
        },
        { 
            value: 'operations', 
            label: 'Aturan & OTA', 
            icon: Clock, 
            fields: ['check_in_time', 'check_out_time', 'min_stay_weekday', 'min_stay_weekend', 'min_stay_peak', 'seo_title', 'seo_description', 'ical_import_urls'] 
        },
        { 
            value: 'checkin', 
            label: 'Check-in & WiFi', 
            icon: Key, 
            fields: ['current_keybox_code', 'checkin_instructions'] 
        }
    ];

    const getTabErrorCount = (tabFields: string[]) => {
        return tabFields.filter(f => {
            if (errors[f]) return true;
            // Catch wildcard or array error keys (e.g. ical_import_urls.0)
            const regex = new RegExp(`^${f}(\\..+)?$`);
            return Object.keys(errors).some(errKey => regex.test(errKey));
        }).length;
    };

    const fieldError = (name: string) =>
        errors[name] ? <p className="text-sm text-red-600 mt-1 font-medium">{errors[name]}</p> : null;

    const inputCls = (name: string) =>
        errors[name] ? 'border-red-500 bg-red-50/20' : '';

    return (
        <form onSubmit={onSubmit} className="space-y-6 pb-24 md:pb-6">
            {/* Error summary banner */}
            {Object.keys(errors).length > 0 && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 rounded-2xl shadow-sm">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="ml-2">
                        <span className="font-bold text-sm">Ada data formulir yang belum sesuai:</span>
                        <ul className="text-xs mt-1 space-y-1 list-disc list-inside opacity-90">
                            {Object.entries(errors).map(([field, msg]) => (
                                <li key={field}>{String(msg)}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Stepper Tabs Bar - Highly Optimized for Mobile Scroll */}
            <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none border-b border-slate-100/80 -mx-4 px-4 sm:mx-0 sm:px-0">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const errCount = getTabErrorCount(tab.fields);
                    const isActive = activeTab === tab.value;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setActiveTab(tab.value as any)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                                isActive 
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100 border-blue-600' 
                                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                            {errCount > 0 && (
                                <Badge className="bg-red-500 text-white hover:bg-red-500 text-[10px] font-extrabold h-5 min-w-5 flex items-center justify-center p-1 rounded-full animate-pulse ml-1">
                                    {errCount}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Contents Area */}
            <div className="space-y-6">
                
                {/* ── 1. Tab: Info Dasar ────────────────────────────────────── */}
                {activeTab === 'basic' && (
                    <div className="space-y-6">
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                    <Building2 className="h-5 w-5 text-blue-600" /> Informasi Dasar Properti
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name">Nama Properti *</Label>
                                        <Input id="name" value={data.name} onChange={e => setData('name', e.target.value)}
                                            placeholder="Villa Sunset Paradise" className={inputCls('name')} />
                                        {fieldError('name')}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="type">Tipe Akomodasi *</Label>
                                        <Select value={data.type} onValueChange={v => setData('type', v as any)}>
                                            <SelectTrigger id="type" className={inputCls('type')}><SelectValue /></SelectTrigger>
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
                                        <div className="space-y-1.5">
                                            <Label htmlFor="owner">Pemilik Properti (Owner) *</Label>
                                            <Select value={data.owner_id} onValueChange={v => setData('owner_id', v)}>
                                                <SelectTrigger id="owner" className={inputCls('owner_id')}><SelectValue placeholder="Select owner..." /></SelectTrigger>
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
                                    <div className="space-y-1.5">
                                        <Label htmlFor="status">Status Aktif *</Label>
                                        <Select value={data.status} onValueChange={v => setData('status', v as any)}>
                                            <SelectTrigger id="status" className={inputCls('status')}><SelectValue /></SelectTrigger>
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

                                <div className="space-y-1.5">
                                    <Label htmlFor="description">Deskripsi Properti *</Label>
                                    <MarkdownEditor
                                        id="description"
                                        value={data.description}
                                        onChange={val => setData('description', val)}
                                        placeholder="Jelaskan detail keunggulan properti Anda..."
                                        rows={8}
                                        error={errors.description}
                                    />
                                    {fieldError('description')}
                                </div>

                                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 w-fit">
                                    <Switch checked={data.is_featured} onCheckedChange={c => setData('is_featured', c)} />
                                    <Label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                        <Star className="h-4 w-4 text-amber-500 fill-amber-400" /> Tandai Unggulan (Featured)
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rekening Bank Properti */}
                        {hasFinancialAccess && (
                            <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                                <CardHeader className="pb-3 border-b border-slate-50">
                                    <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                        <CreditCard className="h-5 w-5 text-blue-600" /> Rekening Bank Properti
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-5">
                                    {/* Payment Method / Bank */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="payment_method_id">Bank (Metode Pembayaran) *</Label>
                                        <Select
                                            value={data.payment_method_id ? data.payment_method_id.toString() : 'none'}
                                            onValueChange={v => {
                                                setData((prev: any) => ({
                                                    ...prev,
                                                    payment_method_id: v && v !== 'none' ? parseInt(v) : null,
                                                    bank_account_id: null // Reset bank account selection when bank changes
                                                }));
                                            }}
                                        >
                                            <SelectTrigger id="payment_method_id">
                                                <SelectValue placeholder="Pilih Bank (Metode Pembayaran)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">-- Pilih Bank (Metode Pembayaran) --</SelectItem>
                                                {paymentMethods.map((pm: any) => (
                                                    <SelectItem key={pm.id} value={pm.id.toString()}>
                                                        {pm.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {fieldError('payment_method_id')}
                                    </div>

                                    {/* Bank Account / Rekening */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="bank_account_id">Rekening Bank Transfer Pembayaran *</Label>
                                        <Select
                                            disabled={!data.payment_method_id}
                                            value={data.bank_account_id ? data.bank_account_id.toString() : 'system_default'}
                                            onValueChange={v => setData('bank_account_id', v && v !== 'system_default' ? parseInt(v) : null)}
                                        >
                                            <SelectTrigger id="bank_account_id">
                                                <SelectValue placeholder={data.payment_method_id ? "Pilih Rekening Bank Properti" : "Pilih Bank terlebih dahulu"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="system_default">-- Gunakan Rekening Sistem (Default) --</SelectItem>
                                                {bankAccounts
                                                    .filter((acc: any) => acc.payment_method_id === data.payment_method_id)
                                                    .map((acc: any) => (
                                                        <SelectItem key={acc.id} value={acc.id.toString()}>
                                                            <span className="font-medium">{acc.label || acc.bank_name}</span>
                                                            <span className="text-muted-foreground ml-2 font-mono text-xs">· {acc.account_number}</span>
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Rekening ini akan ditampilkan pada checkout guest dan link pembayaran secure untuk properti ini.
                                        </p>
                                        {fieldError('bank_account_id')}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* ── 2. Tab: Lokasi & Peta ─────────────────────────────────── */}
                {activeTab === 'location' && (
                    <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <MapPin className="h-5 w-5 text-blue-600" /> Lokasi & Peta Akomodasi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="address">Alamat Lengkap *</Label>
                                <Textarea id="address" value={data.address} onChange={e => handleAddressChange(e.target.value)}
                                    rows={2} placeholder="Jl. Raya Villa No. 123, Canggu, Bali" className={inputCls('address')} />
                                {fieldError('address')}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Wilayah Operasional (Area) *</Label>
                                    <div className="flex gap-4 mt-2">
                                        {['selatan', 'utara'].map(loc => (
                                            <label key={loc} className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 hover:bg-slate-100 transition-colors">
                                                <input type="radio" name="location" value={loc}
                                                    checked={data.location === loc}
                                                    onChange={e => setData('location', e.target.value as 'selatan' | 'utara')}
                                                    className="h-4.5 w-4.5 accent-blue-600" />
                                                <span className="text-sm">{loc === 'selatan' ? '🏡 SELATAN' : '⛰️ UTARA'}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {fieldError('location')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="maps_link">Link Google Maps</Label>
                                    <Input id="maps_link" value={data.maps_link} onChange={e => setData('maps_link', e.target.value)}
                                        placeholder="https://maps.app.goo.gl/..." />
                                    {fieldError('maps_link')}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="tiktok_video_url">TikTok Video URL</Label>
                                <Input id="tiktok_video_url" value={data.tiktok_video_url} onChange={e => setData('tiktok_video_url', e.target.value)}
                                    placeholder="https://www.tiktok.com/@username/video/..." />
                                {fieldError('tiktok_video_url')}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="lat">Latitude</Label>
                                    <Input id="lat" type="number" step="any" value={data.lat ?? ''}
                                        onChange={e => setData('lat', e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="-8.6705" className={inputCls('lat')} />
                                    {fieldError('lat')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="lng">Longitude</Label>
                                    <Input id="lng" type="number" step="any" value={data.lng ?? ''}
                                        onChange={e => setData('lng', e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="115.2126" className={inputCls('lng')} />
                                    {fieldError('lng')}
                                </div>
                                <div className="flex items-end">
                                    <Button type="button" variant="outline" className="w-full font-semibold border-slate-200" onClick={() => setShowMap(!showMap)}>
                                        <MapPin className="h-4 w-4 mr-1 text-slate-500" /> {showMap ? 'Sembunyikan' : 'Pilih Peta'}
                                    </Button>
                                </div>
                            </div>

                            {showMap && (
                                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                    <Map lat={data.lat || mapCenter.lat} lng={data.lng || mapCenter.lng}
                                        height="280px" draggable onLocationChange={handleLocationChange}
                                        propertyName={data.name || 'Properti Baru'} address={data.address} />
                                    <div className="bg-slate-50 p-2.5 text-xs text-slate-500 flex items-center border-t">
                                        <Info className="h-4 w-4 text-blue-500 mr-1.5" /> Geser marker pada peta untuk menyetel koordinat secara presisi
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── 3. Tab: Kamar & Tamu ──────────────────────────────────── */}
                {activeTab === 'rooms' && (
                    <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                <Users className="h-5 w-5 text-blue-600" /> Kapasitas & Kamar
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="capacity">Kapasitas Standar *</Label>
                                    <Input id="capacity" type="number" min={1} value={data.capacity}
                                        onChange={e => setData('capacity', parseInt(e.target.value) || 1)}
                                        className={inputCls('capacity')} />
                                    {fieldError('capacity')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="capacity_max">Kapasitas Maksimal *</Label>
                                    <Input id="capacity_max" type="number" min={data.capacity} value={data.capacity_max}
                                        onChange={e => setData('capacity_max', parseInt(e.target.value) || data.capacity)}
                                        className={inputCls('capacity_max')} />
                                    {fieldError('capacity_max')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="bedroom_count">Kamar Tidur *</Label>
                                    <Input id="bedroom_count" type="number" min={1} value={data.bedroom_count}
                                        onChange={e => setData('bedroom_count', parseInt(e.target.value) || 1)}
                                        className={inputCls('bedroom_count')} />
                                    {fieldError('bedroom_count')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="bathroom_count">Kamar Mandi *</Label>
                                    <Input id="bathroom_count" type="number" min={1} value={data.bathroom_count}
                                        onChange={e => setData('bathroom_count', parseInt(e.target.value) || 1)}
                                        className={inputCls('bathroom_count')} />
                                    {fieldError('bathroom_count')}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── 4. Tab: Keuangan & BEP ────────────────────────────────── */}
                {activeTab === 'pricing' && (
                    <div className="space-y-6">
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                    <DollarSign className="h-5 w-5 text-blue-600" /> Tarif & Premium Pembayaran
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="base_rate">Harga Dasar (IDR / Malam) *</Label>
                                        <Input id="base_rate" type="number" min={0} value={data.base_rate}
                                            onChange={e => setData('base_rate', parseInt(e.target.value) || 0)}
                                            className={inputCls('base_rate')} />
                                        {fieldError('base_rate')}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="weekend_premium_type">Tipe Premium Weekend</Label>
                                        <Select value={data.weekend_premium_type} onValueChange={v => setData('weekend_premium_type', v as any)}>
                                            <SelectTrigger id="weekend_premium_type"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">Persentase (%)</SelectItem>
                                                <SelectItem value="fixed">Nominal Tetap (IDR)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {data.weekend_premium_type === 'percentage' ? (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="weekend_premium_percent">Premium Weekend (%)</Label>
                                            <Input id="weekend_premium_percent" type="number" min={0} max={100} value={data.weekend_premium_percent}
                                                onChange={e => setData('weekend_premium_percent', parseInt(e.target.value) || 0)} />
                                            <p className="text-xs text-slate-400 mt-1">
                                                Estimasi Tarif Weekend: <span className="font-bold text-slate-700">{formatCurrency(data.base_rate * (1 + data.weekend_premium_percent / 100))}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="weekend_premium_fixed">Premium Weekend Fixed (IDR)</Label>
                                            <Input id="weekend_premium_fixed" type="number" min={0} value={data.weekend_premium_fixed}
                                                onChange={e => setData('weekend_premium_fixed', parseInt(e.target.value) || 0)} />
                                            <p className="text-xs text-slate-400 mt-1">
                                                Estimasi Tarif Weekend: <span className="font-bold text-slate-700">{formatCurrency((data.base_rate || 0) + (data.weekend_premium_fixed || 0))}</span>
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label htmlFor="extra_bed_rate">Tarif Extra Bed (IDR / Malam)</Label>
                                        <Input id="extra_bed_rate" type="number" min={0} value={data.extra_bed_rate}
                                            onChange={e => setData('extra_bed_rate', parseInt(e.target.value) || 0)}
                                            className={inputCls('extra_bed_rate')} />
                                        {fieldError('extra_bed_rate')}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ownership & BEP */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                    <Building2 className="h-5 w-5 text-blue-600" /> Skema Kepemilikan & Investasi (BEP)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="ownership_model">Skema Kepemilikan *</Label>
                                        <Select 
                                            value={data.ownership_model} 
                                            onValueChange={v => {
                                                setData('ownership_model', v as any);
                                                if (v === 'owned') {
                                                    setData('monthly_rent_cost', 0);
                                                    setData('owner_split_pct', 100);
                                                    setData('investor_split_pct', 0);
                                                } else if (v === 'rented') {
                                                    setData('monthly_mortgage_cost', 0);
                                                    setData('mortgage_interest_monthly', 0);
                                                    setData('owner_split_pct', 100);
                                                    setData('investor_split_pct', 0);
                                                } else if (v === 'partnership') {
                                                    setData('monthly_rent_cost', 0);
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="ownership_model"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="owned">Owned (Milik Sendiri / KPR)</SelectItem>
                                                <SelectItem value="rented">Rented (Sewa Tahunan)</SelectItem>
                                                <SelectItem value="partnership">Partnership / Kerjasama Investor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {fieldError('ownership_model')}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="initial_build_capital">Modal Awal / Renovasi Awal (IDR)</Label>
                                        <Input id="initial_build_capital" type="number" min={0} value={data.initial_build_capital}
                                            onChange={e => setData('initial_build_capital', parseInt(e.target.value) || 0)} />
                                        {fieldError('initial_build_capital')}
                                    </div>
                                </div>

                                {data.ownership_model === 'rented' && (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="lease_capital">Biaya Sewa / Kontrak (Total Terbayar)</Label>
                                            <Input id="lease_capital" type="number" min={0} value={data.lease_capital}
                                                onChange={e => setData('lease_capital', parseInt(e.target.value) || 0)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="monthly_rent_cost">Beban Sewa Bulanan (Amortisasi)</Label>
                                            <Input id="monthly_rent_cost" type="number" min={0} value={data.monthly_rent_cost}
                                                onChange={e => setData('monthly_rent_cost', parseInt(e.target.value) || 0)} />
                                        </div>
                                    </div>
                                )}

                                {data.ownership_model === 'owned' && (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="monthly_mortgage_cost">Cicilan KPR Bulanan</Label>
                                            <Input id="monthly_mortgage_cost" type="number" min={0} value={data.monthly_mortgage_cost}
                                                onChange={e => setData('monthly_mortgage_cost', parseInt(e.target.value) || 0)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="mortgage_interest_monthly">Beban Bunga Cicilan Bulanan</Label>
                                            <Input id="mortgage_interest_monthly" type="number" min={0} value={data.mortgage_interest_monthly}
                                                onChange={e => setData('mortgage_interest_monthly', parseInt(e.target.value) || 0)} />
                                        </div>
                                    </div>
                                )}

                                {data.ownership_model === 'partnership' && (
                                    <div className="grid sm:grid-cols-2 gap-4 border-t pt-4 border-dashed">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="owner_split_pct">Bagi Hasil Pengelola (%)</Label>
                                            <Input id="owner_split_pct" type="number" min={0} max={100} value={data.owner_split_pct}
                                                onChange={e => {
                                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    setData((prev: any) => ({ ...prev, owner_split_pct: val, investor_split_pct: 100 - val }));
                                                }} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="investor_split_pct">Bagi Hasil Investor (%)</Label>
                                            <Input id="investor_split_pct" type="number" min={0} max={100} value={data.investor_split_pct}
                                                onChange={e => {
                                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    setData((prev: any) => ({ ...prev, investor_split_pct: val, owner_split_pct: 100 - val }));
                                                }} />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── 5. Tab: Foto & Fasilitas ──────────────────────────────── */}
                {activeTab === 'media_amenities' && (
                    <div className="space-y-6">
                        {/* Media Upload */}
                        {isEdit && property ? (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <MediaUpload
                                    propertySlug={property.slug}
                                    initialMedia={(property.media as any) || []}
                                />
                            </div>
                        ) : (
                            <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                                <CardHeader className="pb-3 border-b border-slate-50">
                                    <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                        <ImageIcon className="h-5 w-5 text-blue-600" /> Galeri Foto Properti
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-5">
                                    <FileUpload
                                        config={{
                                            maxFiles: 50,
                                            maxFileSize: 100 * 1024 * 1024,
                                            acceptedFileTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'],
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

                        {/* Amenities Checkboxes */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                    <Building2 className="h-5 w-5 text-blue-600" /> Fasilitas Properti (Amenities)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                                    {Object.entries(amenityCategories).map(([cat, items]) => (
                                        <div key={cat} className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1 border-slate-200/50 mb-3">
                                                {cat.replace('_', ' ')}
                                            </p>
                                            <div className="space-y-1.5">
                                                {items.map(amenity => (
                                                    <label key={amenity.id} className="flex items-center gap-2.5 cursor-pointer py-1 select-none hover:text-blue-600 transition-colors">
                                                        <Checkbox
                                                            checked={Array.isArray(data.amenities) && data.amenities.includes(amenity.id)}
                                                            onCheckedChange={c => handleAmenityToggle(amenity.id, c as boolean)}
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">{amenity.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── 6. Tab: Operasional & SEO ─────────────────────────────── */}
                {activeTab === 'operations' && (
                    <div className="space-y-6">
                        {/* Checkin Setup */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                    <Clock className="h-5 w-5 text-blue-600" /> Konfigurasi Check-in & Keybox
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="check_in_time">Default Check-in Time</Label>
                                        <Input id="check_in_time" type="time" value={data.check_in_time}
                                            onChange={e => setData('check_in_time', e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="check_out_time">Default Check-out Time</Label>
                                        <Input id="check_out_time" type="time" value={data.check_out_time}
                                            onChange={e => setData('check_out_time', e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-4 border-t pt-4 border-dashed border-slate-100">
                                    <div className="space-y-1.5">
                                        <Label>Min Stay Weekday</Label>
                                        <Input type="number" min={1} value={data.min_stay_weekday}
                                            onChange={e => setData('min_stay_weekday', parseInt(e.target.value) || 1)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Min Stay Weekend</Label>
                                        <Input type="number" min={1} value={data.min_stay_weekend}
                                            onChange={e => setData('min_stay_weekend', parseInt(e.target.value) || 1)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Min Stay Peak Season</Label>
                                        <Input type="number" min={1} value={data.min_stay_peak}
                                            onChange={e => setData('min_stay_peak', parseInt(e.target.value) || 1)} />
                                    </div>
                                </div>

                                <div className="space-y-1.5 border-t pt-4 border-dashed border-slate-100">
                                    <Label htmlFor="house_rules">House Rules (Aturan Menginap)</Label>
                                    <MarkdownEditor
                                        id="house_rules"
                                        value={data.house_rules}
                                        onChange={val => setData('house_rules', val)}
                                        placeholder="Dilarang merokok di dalam kamar, Matikan AC jika keluar rumah..."
                                        rows={6}
                                        error={errors.house_rules}
                                    />
                                    {fieldError('house_rules')}
                                </div>

                            </CardContent>
                        </Card>

                        {/* iCal Synchronization */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base">
                                    <Calendar className="h-5 w-5 text-blue-600" /> Sinkronisasi iCal (OTA)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <div>
                                    <Label>Import URLs (Airbnb / Booking.com / Agoda)</Label>
                                    <p className="text-xs text-slate-400 mb-2">Tempel link ekspor iCal dari platform OTA Anda.</p>
                                    {data.ical_import_urls.map((url, i) => (
                                        <div key={i} className="flex gap-2 mt-2">
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
                                                className="shrink-0 text-red-500 hover:text-red-700"
                                                onClick={() => {
                                                    const arr = [...data.ical_import_urls];
                                                    arr.splice(i, 1);
                                                    setData('ical_import_urls', arr.length > 0 ? arr : ['']);
                                                }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2 mt-3">
                                        <Button type="button" variant="outline" size="sm" className="font-bold border-slate-200"
                                            onClick={() => setData('ical_import_urls', [...data.ical_import_urls, ''])}>
                                            <Plus className="h-3.5 w-3.5 mr-1" /> Add OTA Feed
                                        </Button>
                                        {isEdit && (
                                            <Button type="button" variant="secondary" size="sm" className="font-bold"
                                                onClick={handleSyncICal}
                                                disabled={syncing || data.ical_import_urls.every(u => !u)}>
                                                <RefreshCcw className={`h-3.5 w-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                                                {syncing ? 'Syncing...' : 'Sync Now'}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {isEdit && property && data.ical_export_token && (
                                    <>
                                        <Separator />
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 border-dashed space-y-2">
                                            <Label className="text-sm font-bold text-slate-800">iCal Export Feed Properti Anda</Label>
                                            <p className="text-xs text-slate-400">Salin link ini dan tempel di Airbnb/Booking.com untuk sinkronisasi ketersediaan Homs.</p>
                                            <div className="flex items-center gap-2 p-2 bg-white border rounded-xl text-xs">
                                                <code className="font-mono truncate flex-1 text-slate-600">
                                                    {window.location.origin}/property/{property.slug}/ical/{data.ical_export_token}
                                                </code>
                                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
                                                    onClick={() => window.open(`${window.location.origin}/property/${property.slug}/ical/${data.ical_export_token}`, '_blank')}>
                                                    <ExternalLink className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${window.location.origin}/property/{property.slug}/ical/${data.ical_export_token}`);
                                                        alert('iCal link copied to clipboard');
                                                    }}>
                                                    <Save className="h-4 w-4 text-emerald-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* SEO Card */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="text-base text-slate-800">Pengaturan SEO (Search Engine Optimization)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="seo_title">SEO Meta Title</Label>
                                    <Input id="seo_title" value={data.seo_title} onChange={e => setData('seo_title', e.target.value)}
                                        placeholder="Homestay Eksklusif di Jogja - Sunset Homestay" className={inputCls('seo_title')} />
                                    {fieldError('seo_title')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="seo_description">SEO Meta Description</Label>
                                    <Textarea id="seo_description" value={data.seo_description} onChange={e => setData('seo_description', e.target.value)}
                                        rows={2} placeholder="Menginap nyaman bersama keluarga..." className={inputCls('seo_description')} />
                                    {fieldError('seo_description')}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                {/* ── 7. Tab: Instruksi Check-in & WiFi ─────────────────────── */}
                {activeTab === 'checkin' && (
                    <div className="space-y-6">
                        {/* Welcome & Time Info */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
                                    <Info className="h-5 w-5 text-blue-600" /> Informasi Dasar Penyambutan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="welcome" className="font-bold text-slate-700">Pesan Selamat Datang (Welcome Message)</Label>
                                        <Input id="welcome" value={data.checkin_instructions.welcome}
                                            onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, welcome: e.target.value })}
                                            placeholder="Selamat datang di Homs!" />
                                        <span className="text-[11px] text-slate-400">Pesan penyambutan pertama yang dibaca tamu di panduan.</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkin_time_info" className="font-bold text-slate-700">Info Jam Check-in</Label>
                                        <Input id="checkin_time_info" value={data.checkin_instructions.checkin_time}
                                            onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, checkin_time: e.target.value })}
                                            placeholder="Check-in: 14:00 - 22:00" />
                                        <span className="text-[11px] text-slate-400">Informasi jam check-in yang akan tertera bagi tamu.</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Keybox Setup */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
                                    <Key className="h-5 w-5 text-amber-500" /> Pengaturan Keybox & Kode Akses
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-5">
                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="current_keybox_code" className="font-bold text-slate-700">Kode Keybox Utama (3 digit angka)</Label>
                                        <Input id="current_keybox_code" maxLength={3} value={data.current_keybox_code}
                                            onChange={e => setData('current_keybox_code', e.target.value.replace(/\D/g, '').slice(0, 3))}
                                            placeholder="123" className={inputCls('current_keybox_code') + " font-mono font-bold tracking-widest text-base"} />
                                        {fieldError('current_keybox_code')}
                                        <span className="text-[11px] text-slate-400">Kode fisik yang sedang aktif saat ini.</span>
                                    </div>
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label htmlFor="keybox_location" className="font-bold text-slate-700">Lokasi & Petunjuk Keybox</Label>
                                        <Input id="keybox_location" value={data.checkin_instructions.keybox_location}
                                            onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, keybox_location: e.target.value })}
                                            placeholder="Keybox terletak di pilar depan pintu masuk utama" />
                                        <span className="text-[11px] text-slate-400">Beri tahu tamu di mana mereka bisa menemukan kotak kunci.</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5 border-t pt-4 border-dashed border-slate-100">
                                    <Label htmlFor="keybox_code_tpl" className="font-bold text-slate-700">Template Teks Kode Keybox</Label>
                                    <Input id="keybox_code_tpl" value={data.checkin_instructions.keybox_code}
                                        onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, keybox_code: e.target.value })}
                                        placeholder="Kode keybox: {{keybox_code}}" />
                                    <span className="text-[11px] text-slate-400">Gunakan tag <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px] text-slate-700 font-bold">{"{{keybox_code}}"}</code> untuk menyisipkan Kode Keybox Utama secara dinamis ke tamu.</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* WiFi Setup */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
                                    <Wifi className="h-5 w-5 text-blue-500" /> Informasi WiFi & Akses Internet
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wifi_name" className="font-bold text-slate-700">Nama WiFi (SSID)</Label>
                                        <Input id="wifi_name" value={data.checkin_instructions.wifi_name || ''}
                                            onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, wifi_name: e.target.value })}
                                            placeholder="Nama Jaringan WiFi Properti" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wifi_password" className="font-bold text-slate-700">Password WiFi</Label>
                                        <Input id="wifi_password" value={data.checkin_instructions.wifi_password || ''}
                                            onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, wifi_password: e.target.value })}
                                            placeholder="Password WiFi Properti" />
                                    </div>
                                </div>
                                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100/50 flex items-start gap-2.5 mt-2">
                                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] leading-normal text-blue-800">
                                        Informasi WiFi ini akan ditampilkan secara aman pada dashboard tamu <strong>setelah tamu sukses melakukan check-in</strong> dan diverifikasi oleh sistem. Tamu dapat menyalin nama wifi & password dengan sekali klik.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact & Extra Info */}
                        <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
                                    <ExternalLink className="h-5 w-5 text-green-600" /> Kontak Darurat & Info Tambahan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="emergency_contact" className="font-bold text-slate-700">Kontak Darurat (WhatsApp / Phone)</Label>
                                    <Input id="emergency_contact" value={data.checkin_instructions.emergency_contact}
                                        onChange={e => setData('checkin_instructions', { ...data.checkin_instructions, emergency_contact: e.target.value })}
                                        placeholder="Hubungi kami jika ada kendala: 0811-2500-082" />
                                </div>

                                <div className="space-y-2 border-t pt-4 border-dashed border-slate-100">
                                    <Label className="font-bold text-slate-700">Informasi Tambahan Panduan Check-in (Poin/Bullet Points)</Label>
                                    {(data.checkin_instructions.additional_info || []).map((info, i) => (
                                        <div key={i} className="flex gap-2 mt-1.5">
                                            <Input value={info} placeholder={`Langkah Tambahan ${i + 1}`}
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
                                    <div className="flex gap-2 mt-2">
                                        <Button type="button" variant="outline" size="sm" className="font-bold border-slate-200"
                                            onClick={() => setData('checkin_instructions', {
                                                ...data.checkin_instructions,
                                                additional_info: [...(data.checkin_instructions.additional_info || []), '']
                                            })}>
                                            <Plus className="h-3 w-3 mr-1" /> Tambah Poin Informasi
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

            </div>

            {/* Sticky Action Footer - Fixed on Mobile screen, standard block on Desktop */}
            <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto bg-white/95 backdrop-blur-md md:bg-transparent border-t md:border-t-0 border-slate-100 p-4 md:p-0 flex items-center justify-end gap-3 z-50 shadow-lg md:shadow-none">
                <Button type="button" variant="outline" className="flex-1 md:flex-none font-bold rounded-2xl h-11 border-slate-200" asChild>
                    <Link href={isEdit && property ? `/admin/properties/${property.slug}` : '/admin/properties'}>
                        Cancel
                    </Link>
                </Button>
                <Button type="submit" disabled={processing} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl h-11 px-6 shadow-sm shadow-blue-100 transition-all cursor-pointer">
                    <Save className="h-4.5 w-4.5 mr-2" />
                    {processing
                        ? (isEdit ? 'Updating...' : 'Creating...')
                        : (isEdit ? 'Update Property' : 'Create Property')
                    }
                </Button>
            </div>
        </form>
    );
}
