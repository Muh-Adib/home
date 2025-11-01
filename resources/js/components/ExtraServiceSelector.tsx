import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Image as ImageIcon } from 'lucide-react';

export interface ServiceMaster {
    id: number;
    name: string;
    description?: string;
    service_type: string;
    service_type_label: string;
    unit_price: number;
    thumbnail_url?: string;
    is_active: boolean;
}

export interface SelectedService {
    service_master_id: number;
    service_name: string;
    service_type: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface ExtraServiceSelectorProps {
    services: ServiceMaster[];
    selectedServices: SelectedService[];
    onServicesChange: (services: SelectedService[]) => void;
    nights?: number; // Number of nights for per-night services
}

export default function ExtraServiceSelector({
    services,
    selectedServices,
    onServicesChange,
    nights = 1,
}: ExtraServiceSelectorProps) {
    const [selected, setSelected] = useState<Set<number>>(
        new Set(selectedServices.map(s => s.service_master_id))
    );

    useEffect(() => {
        setSelected(new Set(selectedServices.map(s => s.service_master_id)));
    }, [selectedServices]);

    const handleServiceToggle = (service: ServiceMaster) => {
        const newSelected = new Set(selected);
        if (newSelected.has(service.id)) {
            newSelected.delete(service.id);
            // Remove from selected services
            const updated = selectedServices.filter(s => s.service_master_id !== service.id);
            onServicesChange(updated);
        } else {
            newSelected.add(service.id);
            // Add to selected services with default quantity
            const newService: SelectedService = {
                service_master_id: service.id,
                service_name: service.name,
                service_type: service.service_type,
                quantity: 1,
                unit_price: service.unit_price,
                total_price: service.unit_price,
            };
            onServicesChange([...selectedServices, newService]);
        }
        setSelected(newSelected);
    };

    const handleQuantityChange = (serviceId: number, delta: number) => {
        const updated = selectedServices.map(service => {
            if (service.service_master_id === serviceId) {
                const newQuantity = Math.max(1, service.quantity + delta);
                const newTotal = newQuantity * service.unit_price;
                return {
                    ...service,
                    quantity: newQuantity,
                    total_price: newTotal,
                };
            }
            return service;
        });
        onServicesChange(updated);
    };

    const handleQuantityInput = (serviceId: number, value: string) => {
        const quantity = Math.max(1, parseInt(value) || 1);
        const updated = selectedServices.map(service => {
            if (service.service_master_id === serviceId) {
                const newTotal = quantity * service.unit_price;
                return {
                    ...service,
                    quantity,
                    total_price: newTotal,
                };
            }
            return service;
        });
        onServicesChange(updated);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const getSelectedService = (serviceId: number): SelectedService | undefined => {
        return selectedServices.find(s => s.service_master_id === serviceId);
    };

    const getTotalServicesPrice = () => {
        return selectedServices.reduce((sum, service) => sum + service.total_price, 0);
    };

    // Filter active services only
    const activeServices = services.filter(s => s.is_active);

    if (activeServices.length === 0) {
        return (
            <Card>
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
                <Label className="text-base font-semibold">Layanan Tambahan</Label>
                {selectedServices.length > 0 && (
                    <Badge variant="secondary">
                        Total: {formatPrice(getTotalServicesPrice())}
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeServices.map((service) => {
                    const isSelected = selected.has(service.id);
                    const selectedService = getSelectedService(service.id);

                    return (
                        <Card
                            key={service.id}
                            className={`cursor-pointer transition-all ${
                                isSelected
                                    ? 'ring-2 ring-primary border-primary'
                                    : 'hover:border-gray-300'
                            }`}
                        >
                            <CardContent className="p-4">
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
                                                    className="w-full h-24 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="w-full h-24 bg-gray-200 rounded flex items-center justify-center">
                                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Service Info */}
                                        <div className="space-y-1">
                                            <div className="font-medium text-sm">{service.name}</div>
                                            {service.description && (
                                                <p className="text-xs text-gray-500 line-clamp-2">
                                                    {service.description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs">
                                                    {service.service_type_label}
                                                </Badge>
                                                <span className="text-sm font-semibold">
                                                    {formatPrice(service.unit_price)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Quantity Control (if selected) */}
                                        {isSelected && selectedService && (
                                            <div className="mt-3 pt-3 border-t">
                                                <Label className="text-xs mb-1 block">Quantity</Label>
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleQuantityChange(service.id, -1)
                                                        }
                                                        disabled={selectedService.quantity <= 1}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={selectedService.quantity}
                                                        onChange={(e) =>
                                                            handleQuantityInput(
                                                                service.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-16 text-center text-sm"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleQuantityChange(service.id, 1)
                                                        }
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="mt-1 text-xs text-gray-600">
                                                    Subtotal: {formatPrice(selectedService.total_price)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Selected Services Summary */}
            {selectedServices.length > 0 && (
                <Card className="bg-gray-50">
                    <CardContent className="p-4">
                        <Label className="text-sm font-semibold mb-2 block">
                            Ringkasan Layanan Terpilih
                        </Label>
                        <div className="space-y-2">
                            {selectedServices.map((service) => (
                                <div
                                    key={service.service_master_id}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span>
                                        {service.service_name} (x{service.quantity})
                                    </span>
                                    <span className="font-medium">
                                        {formatPrice(service.total_price)}
                                    </span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between text-base font-semibold pt-2 border-t">
                                <span>Total Layanan</span>
                                <span>{formatPrice(getTotalServicesPrice())}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

