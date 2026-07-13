import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Calendar } from 'lucide-react';

export interface ServiceMaster {
    id: number;
    name: string;
    description?: string;
    service_type: string;
    service_type_label: string;
    unit_price: number;
    vendor_unit_price: number;
    discount_amount: number;
    discount_limit: number | null;
    thumbnail_url?: string;
    is_active: boolean;
    property_id?: number | null;
    is_default?: boolean;
    default_quantity?: number;
    default_frequency?: 'once' | 'per_night' | 'first_night' | 'first_two_nights';
    discount_frequency?: 'all' | 'first_night';
}

export interface SelectedService {
    id?: number;
    service_master_id: number;
    service_name: string;
    service_type: string;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    total_price: number;
    vendor_unit_price?: number;
    vendor_total_price?: number;
    service_date?: string | null;
}

interface ExtraServiceSelectorProps {
    services: ServiceMaster[];
    selectedServices: SelectedService[];
    onServicesChange: (services: SelectedService[]) => void;
    nights?: number;
    checkInDate?: string;
    checkOutDate?: string;
    selectedPropertyId?: string;
}

export default function ExtraServiceSelector({
    services,
    selectedServices,
    onServicesChange,
    nights = 1,
    checkInDate,
    checkOutDate,
    selectedPropertyId,
}: ExtraServiceSelectorProps) {
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [customPerDate, setCustomPerDate] = useState<Record<number, boolean>>({});

    // Helper to extract YYYY-MM-DD from any date string formats
    const normalizeDateStr = (dateStr?: string | null) => {
        if (!dateStr) return null;
        return dateStr.split(' ')[0].split('T')[0];
    };

    // Helper to get dates of stay
    const getDatesOfStay = () => {
        if (!checkInDate || !checkOutDate) return [];
        const datesList = [];
        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            datesList.push(d.toISOString().split('T')[0]);
        }
        return datesList;
    };

    const dates = getDatesOfStay();

    useEffect(() => {
        // Find which master IDs are selected
        const selectedIds = new Set(selectedServices.map(s => Number(s.service_master_id)));
        setSelected(selectedIds);

        // Find which ones are set to per-date customization
        const customMap: Record<number, boolean> = {};
        
        // 1. Any service that currently has a service_date entry
        selectedServices.forEach(s => {
            if (s.service_date) {
                customMap[Number(s.service_master_id)] = true;
            }
        });

        // 2. Any active selected service with a date-specific default frequency
        services.forEach(service => {
            if (selectedIds.has(Number(service.id)) && service.default_frequency && service.default_frequency !== 'once') {
                customMap[Number(service.id)] = true;
            }
        });

        setCustomPerDate(prev => ({ ...prev, ...customMap }));
    }, [selectedServices, services]);

    // Recalculates discounts and vendor pricing for all items using master pricing config rules
    const recalculateServiceAllocations = (
        items: SelectedService[],
        masters: ServiceMaster[]
    ): SelectedService[] => {
        const groups: Record<number, SelectedService[]> = {};
        items.forEach(item => {
            const masterId = Number(item.service_master_id);
            if (!groups[masterId]) {
                groups[masterId] = [];
            }
            groups[masterId].push(item);
        });

        const result: SelectedService[] = [];

        Object.entries(groups).forEach(([masterIdStr, groupItems]) => {
            const masterId = Number(masterIdStr);
            const master = masters.find(m => Number(m.id) === masterId);
            if (!master) {
                result.push(...groupItems);
                return;
            }

            const unitPrice = Number(master.unit_price);
            const vendorUnitPrice = Number(master.vendor_unit_price || 0);
            const discountAmount = Number(master.discount_amount || 0);
            const discountLimit = master.discount_limit ? Number(master.discount_limit) : null;

            const discountFreq = master.discount_frequency || 'all';

            // Sort groupItems by service_date ascending to identify the first night
            const sortedGroupItems = [...groupItems].sort((a, b) => {
                if (!a.service_date) return -1;
                if (!b.service_date) return 1;
                return a.service_date.localeCompare(b.service_date);
            });

            sortedGroupItems.forEach((item, index) => {
                const qty = item.quantity;
                let discountedQty = 0;

                // Check if eligible for discount (all dates, or only the first night)
                const isEligible = (discountFreq === 'all') || (discountFreq === 'first_night' && index === 0);

                if (isEligible && discountAmount > 0) {
                    if (discountLimit !== null && discountLimit > 0) {
                        discountedQty = Math.min(qty, discountLimit);
                    } else {
                        discountedQty = qty;
                    }
                }

                const normalQty = qty - discountedQty;
                const itemTotalPrice = (discountedQty * (unitPrice - discountAmount)) + (normalQty * unitPrice);
                const itemDiscountPerUnit = qty > 0 ? (discountedQty * discountAmount) / qty : 0;

                result.push({
                    ...item,
                    unit_price: unitPrice,
                    discount_amount: itemDiscountPerUnit,
                    total_price: itemTotalPrice,
                    vendor_unit_price: vendorUnitPrice,
                    vendor_total_price: qty * vendorUnitPrice,
                });
            });
        });

        return result;
    };

    const handleServiceToggle = (service: ServiceMaster) => {
        const serviceId = Number(service.id);
        const newSelected = new Set(selected);
        let updated: SelectedService[] = [];
        if (newSelected.has(serviceId)) {
            newSelected.delete(serviceId);
            updated = selectedServices.filter(s => Number(s.service_master_id) !== serviceId);
        } else {
            newSelected.add(serviceId);
            const qty = service.default_quantity || 1;
            const freq = service.default_frequency || 'once';

            if (freq === 'per_night' && dates.length > 0) {
                const dateEntries = dates.map(date => ({
                    service_master_id: serviceId,
                    service_name: service.name,
                    service_type: service.service_type,
                    quantity: qty,
                    unit_price: service.unit_price,
                    discount_amount: 0,
                    total_price: qty * service.unit_price,
                    vendor_unit_price: service.vendor_unit_price || 0,
                    vendor_total_price: qty * (service.vendor_unit_price || 0),
                    service_date: date,
                }));
                updated = [...selectedServices, ...dateEntries];
            } else if (freq === 'first_night' && dates.length > 0) {
                const newEntry: SelectedService = {
                    service_master_id: serviceId,
                    service_name: service.name,
                    service_type: service.service_type,
                    quantity: qty,
                    unit_price: service.unit_price,
                    discount_amount: 0,
                    total_price: qty * service.unit_price,
                    vendor_unit_price: service.vendor_unit_price || 0,
                    vendor_total_price: qty * (service.vendor_unit_price || 0),
                    service_date: dates[0],
                };
                updated = [...selectedServices, newEntry];
            } else if (freq === 'first_two_nights' && dates.length > 0) {
                const targetDates = dates.slice(0, 2);
                const dateEntries = targetDates.map(date => ({
                    service_master_id: service.id,
                    service_name: service.name,
                    service_type: service.service_type,
                    quantity: qty,
                    unit_price: service.unit_price,
                    discount_amount: 0,
                    total_price: qty * service.unit_price,
                    vendor_unit_price: service.vendor_unit_price || 0,
                    vendor_total_price: qty * (service.vendor_unit_price || 0),
                    service_date: date,
                }));
                updated = [...selectedServices, ...dateEntries];
            } else {
                const newService: SelectedService = {
                    service_master_id: service.id,
                    service_name: service.name,
                    service_type: service.service_type,
                    quantity: qty,
                    unit_price: service.unit_price,
                    discount_amount: 0,
                    total_price: qty * service.unit_price,
                    vendor_unit_price: service.vendor_unit_price || 0,
                    vendor_total_price: qty * (service.vendor_unit_price || 0),
                    service_date: null,
                };
                updated = [...selectedServices, newService];
            }
        }
        setSelected(newSelected);
        onServicesChange(recalculateServiceAllocations(updated, services));
    };

    const handleToggleCustomPerDate = (serviceId: number, isCustom: boolean) => {
        const normalizedServiceId = Number(serviceId);
        setCustomPerDate(prev => ({ ...prev, [normalizedServiceId]: isCustom }));

        const master = services.find(s => Number(s.id) === normalizedServiceId);
        if (!master) return;

        let updated: SelectedService[] = [];
        if (isCustom) {
            updated = selectedServices.filter(s => Number(s.service_master_id) !== normalizedServiceId);
            if (dates.length > 0) {
                const defaultDateEntries = dates.map(date => ({
                    service_master_id: normalizedServiceId,
                    service_name: master.name,
                    service_type: master.service_type,
                    quantity: master.default_quantity || 1,
                    unit_price: master.unit_price,
                    discount_amount: 0,
                    total_price: (master.default_quantity || 1) * master.unit_price,
                    vendor_unit_price: master.vendor_unit_price || 0,
                    vendor_total_price: (master.default_quantity || 1) * (master.vendor_unit_price || 0),
                    service_date: date,
                }));
                updated = [...updated, ...defaultDateEntries];
            }
        } else {
            updated = selectedServices.filter(s => Number(s.service_master_id) !== normalizedServiceId);
            const simpleEntry: SelectedService = {
                service_master_id: normalizedServiceId,
                service_name: master.name,
                service_type: master.service_type,
                quantity: master.default_quantity || 1,
                unit_price: master.unit_price,
                discount_amount: 0,
                total_price: (master.default_quantity || 1) * master.unit_price,
                vendor_unit_price: master.vendor_unit_price || 0,
                vendor_total_price: (master.default_quantity || 1) * (master.vendor_unit_price || 0),
                service_date: null,
            };
            updated = [...updated, simpleEntry];
        }
        onServicesChange(recalculateServiceAllocations(updated, services));
    };

    const handleToggleServiceDate = (service: ServiceMaster, date: string, isEnabled: boolean) => {
        const serviceId = Number(service.id);
        let updated: SelectedService[] = [];
        if (isEnabled) {
            const newEntry: SelectedService = {
                service_master_id: serviceId,
                service_name: service.name,
                service_type: service.service_type,
                quantity: 1,
                unit_price: service.unit_price,
                discount_amount: 0,
                total_price: service.unit_price,
                vendor_unit_price: service.vendor_unit_price || 0,
                vendor_total_price: service.vendor_unit_price || 0,
                service_date: date,
            };
            updated = [...selectedServices, newEntry];
        } else {
            updated = selectedServices.filter(
                s => !(Number(s.service_master_id) === serviceId && normalizeDateStr(s.service_date) === date)
            );
        }
        onServicesChange(recalculateServiceAllocations(updated, services));
    };

    const handleUpdateServiceOnDate = (
        serviceId: number,
        date: string,
        quantity: number
    ) => {
        const normalizedServiceId = Number(serviceId);
        const updated = selectedServices.map(s => {
            if (Number(s.service_master_id) === normalizedServiceId && normalizeDateStr(s.service_date) === date) {
                return { ...s, quantity };
            }
            return s;
        });
        onServicesChange(recalculateServiceAllocations(updated, services));
    };

    const handleUpdateSimpleService = (
        serviceId: number,
        quantity: number
    ) => {
        const normalizedServiceId = Number(serviceId);
        const updated = selectedServices.map(s => {
            if (Number(s.service_master_id) === normalizedServiceId && !s.service_date) {
                return { ...s, quantity };
            }
            return s;
        });
        onServicesChange(recalculateServiceAllocations(updated, services));
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const getTotalServicesPrice = () => {
        return selectedServices.reduce((sum, service) => sum + service.total_price, 0);
    };

    const activeServices = services.filter(s => {
        if (!s.is_active) return false;
        if (!s.property_id) return true; // Global service
        if (!selectedPropertyId) return false; // If no unit is selected, hide property-specific ones
        return Number(s.property_id) === Number(selectedPropertyId);
    });

    if (activeServices.length === 0) {
        return (
            <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-6">
                    <p className="text-sm text-gray-500 text-center">
                        Tidak ada layanan tambahan tersedia
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                    Layanan Tambahan
                </Label>
                {selectedServices.length > 0 && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 font-semibold">
                        Total: {formatPrice(getTotalServicesPrice())}
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeServices.map((service) => {
                    const isSelected = selected.has(Number(service.id));

                    return (
                        <Card
                            key={service.id}
                            className={`transition-all ${
                                isSelected
                                    ? 'ring-1 ring-blue-500 border-blue-500 shadow-sm'
                                    : 'hover:border-gray-300'
                            }`}
                        >
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleServiceToggle(service)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                        {/* Thumbnail */}
                                        <div className="mb-2">
                                            {service.thumbnail_url ? (
                                                <img
                                                    src={service.thumbnail_url}
                                                    alt={service.name}
                                                    className="w-full h-20 object-cover rounded border border-slate-100"
                                                />
                                            ) : (
                                                <div className="w-full h-20 bg-slate-100 rounded border border-slate-200/60 flex items-center justify-center">
                                                    <ImageIcon className="w-5 h-5 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Service Info */}
                                        <div className="space-y-1">
                                            <div className="font-semibold text-sm text-slate-800">{service.name}</div>
                                            {service.description && (
                                                <p className="text-xs text-gray-500 line-clamp-2">
                                                    {service.description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between pt-1">
                                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-slate-500">
                                                    {service.service_type_label}
                                                </Badge>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {formatPrice(service.unit_price)}
                                                    </span>
                                                    {service.discount_amount > 0 && (
                                                        <span className="text-[9px] text-rose-600 font-semibold">
                                                            Diskon: -{formatPrice(service.discount_amount)}
                                                            {service.discount_limit ? ` (Batas: ${service.discount_limit} unit)` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Pricing/Date Management */}
                                {isSelected && dates.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                                Atur per Tanggal Menginap
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={customPerDate[Number(service.id)] || false}
                                                onChange={(e) => handleToggleCustomPerDate(Number(service.id), e.target.checked)}
                                                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                            />
                                        </div>

                                        {customPerDate[Number(service.id)] ? (
                                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                                {/* Header Row */}
                                                <div className="grid grid-cols-12 gap-1 text-[9px] font-bold text-slate-400 pb-1 border-b border-slate-100">
                                                    <div className="col-span-4">Tanggal</div>
                                                    <div className="col-span-3 text-center">Qty</div>
                                                    <div className="col-span-2 text-right">Tarif</div>
                                                    <div className="col-span-3 text-right">Subtotal</div>
                                                </div>

                                                {dates.map((date) => {
                                                    const serviceOnDate = selectedServices.find(
                                                        s => Number(s.service_master_id) === Number(service.id) && normalizeDateStr(s.service_date) === date
                                                    );
                                                    const isEnabled = !!serviceOnDate;

                                                    return (
                                                        <div key={date} className="space-y-1.5 border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                                                            <div className="grid grid-cols-12 gap-1 items-center">
                                                                <div className="col-span-4">
                                                                    <label className="text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer">
                                                                        <Checkbox
                                                                            checked={isEnabled}
                                                                            onCheckedChange={(checked) => handleToggleServiceDate(service, date, !!checked)}
                                                                        />
                                                                        <span className="truncate">
                                                                            {new Date(date).toLocaleDateString('id-ID', {
                                                                                weekday: 'short',
                                                                                day: 'numeric',
                                                                                month: 'short'
                                                                            })}
                                                                        </span>
                                                                    </label>
                                                                </div>

                                                                {isEnabled && serviceOnDate ? (
                                                                    <>
                                                                        <div className="col-span-3">
                                                                            <Input
                                                                                type="number"
                                                                                min="1"
                                                                                value={serviceOnDate.quantity}
                                                                                onChange={(e) => handleUpdateServiceOnDate(Number(service.id), date, parseInt(e.target.value) || 1)}
                                                                                className="h-7 text-[11px] text-center px-1"
                                                                            />
                                                                        </div>
                                                                        <div className="col-span-2 text-right text-[11px] text-slate-500 font-medium">
                                                                            {formatPrice(service.unit_price)}
                                                                        </div>
                                                                        <div className="col-span-3 text-right font-bold text-[11px] text-slate-700">
                                                                            {formatPrice(serviceOnDate.total_price)}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="col-span-8 text-[10px] text-slate-300 italic text-center">
                                                                        Belum aktif
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Detailed Discount breakdown row if discount is applied */}
                                                            {isEnabled && serviceOnDate && serviceOnDate.discount_amount && Number(serviceOnDate.discount_amount) > 0 ? (
                                                                <div className="flex items-center justify-between pl-5 text-[10px] text-rose-600 font-medium">
                                                                    <span>Potongan Diskon:</span>
                                                                    <span>-{formatPrice(Number(serviceOnDate.discount_amount) * serviceOnDate.quantity)}</span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            // Simple Mode
                                            <div className="space-y-2 bg-slate-50 p-2.5 rounded border border-slate-100/60">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">Jumlah (Qty)</span>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={selectedServices.find(s => Number(s.service_master_id) === Number(service.id) && !s.service_date)?.quantity || 1}
                                                        onChange={(e) => handleUpdateSimpleService(Number(service.id), parseInt(e.target.value) || 1)}
                                                        className="h-7 w-20 text-center px-1"
                                                    />
                                                </div>

                                                {/* Pricing Preview for Simple Mode */}
                                                {(() => {
                                                    const current = selectedServices.find(s => Number(s.service_master_id) === Number(service.id) && !s.service_date);
                                                    if (!current) return null;

                                                    return (
                                                        <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-200/50 space-y-1">
                                                            <div className="flex justify-between">
                                                                 <span>Harga Jual:</span>
                                                                 <span>{formatPrice(service.unit_price)}</span>
                                                            </div>
                                                            {current.discount_amount && Number(current.discount_amount) > 0 ? (
                                                                <div className="flex justify-between text-rose-600 font-medium">
                                                                    <span>Diskon:</span>
                                                                    <span>-{formatPrice(Number(current.discount_amount) * current.quantity)}</span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })()}

                                                <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1.5 border-t border-slate-200/50 mt-1">
                                                    <span>Subtotal</span>
                                                    <span className="font-bold text-blue-600">
                                                        {formatPrice(selectedServices.find(s => Number(s.service_master_id) === Number(service.id) && !s.service_date)?.total_price ?? 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Selected Services Summary */}
            {selectedServices.length > 0 && (
                <Card className="bg-slate-50/50 border border-slate-200">
                    <CardContent className="p-4 space-y-3">
                        <Label className="text-sm font-semibold text-slate-800 block">
                            Ringkasan Layanan Terpilih
                        </Label>
                        <div className="divide-y divide-slate-100 text-xs">
                            {selectedServices.map((service, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                                >
                                    <div>
                                        <div className="font-medium text-slate-700">
                                            {service.service_name} (x{service.quantity})
                                        </div>
                                        {service.service_date && (
                                            <div className="text-[10px] text-slate-500">
                                                Tanggal: {new Date(service.service_date).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-500 space-x-2">
                                            <span>Harga Jual: {formatPrice(service.unit_price)}</span>
                                            {service.discount_amount && Number(service.discount_amount) > 0 ? (
                                                <span className="text-rose-600">Diskon: -{formatPrice(Number(service.discount_amount) * service.quantity)}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-800">
                                        {formatPrice(service.total_price)}
                                    </span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border-slate-200 mt-2 text-slate-800">
                                <span>Total Layanan</span>
                                <span className="text-blue-600">{formatPrice(getTotalServicesPrice())}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
