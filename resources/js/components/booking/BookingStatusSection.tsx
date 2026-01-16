/**
 * Booking Status Section Component
 * Admin-only component for managing booking and payment status
 * Optimized with React.memo
 */

import React, { memo, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookingStatus, PaymentStatus, type BookingStatus as BookingStatusType, type PaymentStatus as PaymentStatusType } from '@/types';

export interface BookingStatusSectionProps {
    bookingStatus: string;
    paymentStatus: string;
    dpPercentage: number;
    checkInTime: string;
    source: string;
    onBookingStatusChange: (status: string) => void;
    onPaymentStatusChange: (status: string) => void;
    onDpPercentageChange: (percentage: number) => void;
    onCheckInTimeChange: (time: string) => void;
    onSourceChange: (source: string) => void;
    errors?: {
        booking_status?: string;
        payment_status?: string;
        dp_percentage?: string;
        check_in_time?: string;
        source?: string;
    };
}

const BookingStatusSection = memo(function BookingStatusSection({
    bookingStatus,
    paymentStatus,
    dpPercentage,
    checkInTime,
    source,
    onBookingStatusChange,
    onPaymentStatusChange,
    onDpPercentageChange,
    onCheckInTimeChange,
    onSourceChange,
    errors = {},
}: BookingStatusSectionProps) {
    // Memoized handlers
    const handleDpPercentageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onDpPercentageChange(parseInt(e.target.value) || 0);
    }, [onDpPercentageChange]);

    const handleCheckInTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onCheckInTimeChange(e.target.value);
    }, [onCheckInTimeChange]);

    return (
        <div className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <Label htmlFor="booking_status">Status Booking *</Label>
                    <Select value={bookingStatus} onValueChange={onBookingStatusChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending_verification">Menunggu Verifikasi</SelectItem>
                            <SelectItem value="confirmed">Terkonfirmasi</SelectItem>
                            <SelectItem value="checked_in">Checked In</SelectItem>
                            <SelectItem value="checked_out">Checked Out</SelectItem>
                            <SelectItem value="cancelled">Dibatalkan</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.booking_status && (
                        <p className="text-red-500 text-sm mt-1">{errors.booking_status}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="payment_status">Status Pembayaran *</Label>
                    <Select value={paymentStatus} onValueChange={onPaymentStatusChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dp_pending">DP Pending</SelectItem>
                            <SelectItem value="dp_received">DP Diterima</SelectItem>
                            <SelectItem value="fully_paid">Lunas</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.payment_status && (
                        <p className="text-red-500 text-sm mt-1">{errors.payment_status}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="dp_percentage">Persentase DP (%)</Label>
                    <Input
                        id="dp_percentage"
                        type="number"
                        min="0"
                        max="100"
                        value={dpPercentage}
                        onChange={handleDpPercentageChange}
                    />
                </div>

                <div>
                    <Label htmlFor="source">Sumber Booking</Label>
                    <Select value={source} onValueChange={onSourceChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="phone">Telepon</SelectItem>
                            <SelectItem value="walk_in">Walk-in</SelectItem>
                            <SelectItem value="ota">OTA</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="check_in_time">Waktu Check-in</Label>
                    <Input
                        id="check_in_time"
                        type="time"
                        value={checkInTime}
                        onChange={handleCheckInTimeChange}
                    />
                </div>
            </div>
        </div>
    );
});

export default BookingStatusSection;
