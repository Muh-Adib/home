/**
 * Booking Summary Card Component
 * Shows total calculation summary
 * Highly re usable for both admin and public contexts
 * Optimized with React.memo
 */

import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Bed, Package, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/booking-form.utils';
import type { RateCalculation } from '@/types/booking-form.types';

export interface BookingSummaryCardProps {
    totalGuests: number;
    extraBeds: number;
    servicesTotal?: number;
    rateCalculation: RateCalculation | null;
    manualOverride?: {
        enabled: boolean;
        amount: number;
    };
    compact?: boolean;
    className?: string;
}

const BookingSummaryCard = memo(function BookingSummaryCard({
    totalGuests,
    extraBeds,
    servicesTotal = 0,
    rateCalculation,
    manualOverride,
    compact = false,
    className = '',
}: BookingSummaryCardProps) {
    // Memoize final total calculation
    const finalTotal = useMemo(() => {
        if (manualOverride?.enabled) {
            return manualOverride.amount + servicesTotal;
        }
        return (rateCalculation?.total_amount || 0) + servicesTotal;
    }, [rateCalculation, servicesTotal, manualOverride]);

    if (compact) {
        return (
            <div className={`bg-slate-50 p-4 rounded-lg ${className}`}>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(finalTotal)}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="h-5 w-5" />
                    Ringkasan Booking
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>Total Tamu</span>
                    </div>
                    <span className="font-medium">{totalGuests} orang</span>
                </div>

                {extraBeds > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Bed className="h-4 w-4" />
                            <span>Extra Beds</span>
                        </div>
                        <span className="font-medium">{extraBeds} bed</span>
                    </div>
                )}

                {servicesTotal > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Package className="h-4 w-4" />
                            <span>Layanan Tambahan</span>
                        </div>
                        <span className="font-medium">{formatCurrency(servicesTotal)}</span>
                    </div>
                )}

                <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                            {manualOverride?.enabled ? 'Total (Manual Override)' : 'Total Pembayaran'}
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                            {formatCurrency(finalTotal)}
                        </span>
                    </div>
                    {rateCalculation && (
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {formatCurrency(finalTotal / rateCalculation.nights)}/malam × {rateCalculation.nights} malam
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

export default BookingSummaryCard;
