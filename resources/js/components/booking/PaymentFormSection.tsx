/**
 * Payment Form Section Component
 * Configurable payment form for admin (full) or public (upload-only)
 * Optimized with React.memo
 */

import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/booking-form.utils';
import type { PaymentFormData, PaymentMethod } from '@/types/booking-form.types';

export interface PaymentFormSectionProps {
    mode?: 'full' | 'upload-only';
    paymentMethods?: PaymentMethod[];
    paymentData: PaymentFormData;
    onPaymentDataChange: (data: Partial<PaymentFormData>) => void;
    paymentProof?: File | null;
    onPaymentProofChange: (file: File | null) => void;
    totalAmount: number;
    errors?: Partial<Record<keyof PaymentFormData, string>>;
}

const PaymentFormSection = memo(function PaymentFormSection({
    mode = 'full',
    paymentMethods = [],
    paymentData,
    onPaymentDataChange,
    paymentProof,
    onPaymentProofChange,
    totalAmount,
    errors = {},
}: PaymentFormSectionProps) {
    // Memoized handlers
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onPaymentProofChange(e.target.files?.[0] || null);
    }, [onPaymentProofChange]);

    const handleFieldChange = useCallback((field: keyof PaymentFormData) => {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            onPaymentDataChange({ [field]: e.target.value });
        };
    }, [onPaymentDataChange]);

    const handleSelectChange = useCallback((field: keyof PaymentFormData) => {
        return (value: string) => {
            onPaymentDataChange({ [field]: value });
        };
    }, [onPaymentDataChange]);

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onPaymentDataChange({ amount: parseFloat(e.target.value) || 0 });
    }, [onPaymentDataChange]);

    // Upload-only mode for public
    if (mode === 'upload-only') {
        return (
            <div>
                <Label htmlFor="payment_proof">Bukti Pembayaran</Label>
                <Input
                    id="payment_proof"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                {paymentProof && (
                    <p className="text-sm text-gray-600 mt-1">
                        Selected: {paymentProof.name}
                    </p>
                )}
            </div>
        );
    }

    // Full mode for admin
    return (
        <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Informasi Pembayaran
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="payment_method_id">Metode Pembayaran *</Label>
                        <Select
                            value={paymentData.payment_method_id}
                            onValueChange={handleSelectChange('payment_method_id')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih metode pembayaran" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map(method => (
                                    <SelectItem key={method.id} value={method.id.toString()}>
                                        {method.name} {method.bank_name ? `- ${method.bank_name}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.payment_method_id && (
                            <p className="text-red-500 text-sm mt-1">{errors.payment_method_id}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="payment_amount">Jumlah Pembayaran *</Label>
                        <Input
                            id="payment_amount"
                            type="number"
                            value={paymentData.amount}
                            onChange={handleAmountChange}
                            placeholder="Jumlah pembayaran"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Total: {formatCurrency(totalAmount)}
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="payment_date">Tanggal Pembayaran</Label>
                        <Input
                            id="payment_date"
                            type="date"
                            value={paymentData.payment_date}
                            onChange={handleFieldChange('payment_date')}
                        />
                    </div>

                    <div>
                        <Label htmlFor="reference_number">Nomor Referensi</Label>
                        <Input
                            id="reference_number"
                            value={paymentData.reference_number}
                            onChange={handleFieldChange('reference_number')}
                            placeholder="Nomor referensi transfer"
                        />
                    </div>

                    <div>
                        <Label htmlFor="payment_proof">Bukti Pembayaran</Label>
                        <Input
                            id="payment_proof"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div>
                        <Label htmlFor="payment_status_select">Status Verifikasi</Label>
                        <Select
                            value={paymentData.payment_status}
                            onValueChange={handleSelectChange('payment_status')}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div>
                    <Label htmlFor="verification_notes">Catatan Verifikasi</Label>
                    <Textarea
                        id="verification_notes"
                        value={paymentData.verification_notes}
                        onChange={handleFieldChange('verification_notes')}
                        placeholder="Catatan untuk verifikasi pembayaran..."
                        rows={2}
                    />
                </div>
            </CardContent>
        </Card>
    );
});

export default PaymentFormSection;
