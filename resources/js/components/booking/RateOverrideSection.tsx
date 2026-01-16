/**
 * Rate Override Section Component
 * Admin-only component for manual rate override
 * Optimized with React.memo
 */

import React, { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/booking-form.utils';

export interface RateOverrideSectionProps {
    enabled: boolean;
    amount: number;
    reason: string;
    onEnabledChange: (enabled: boolean) => void;
    onAmountChange: (amount: number) => void;
    onReasonChange: (reason: string) => void;
    calculatedRate?: number;
    errors?: {
        override_amount?: string;
        override_reason?: string;
    };
}

const RateOverrideSection = memo(function RateOverrideSection({
    enabled,
    amount,
    reason,
    onEnabledChange,
    onAmountChange,
    onReasonChange,
    calculatedRate,
    errors = {},
}: RateOverrideSectionProps) {
    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onAmountChange(parseFloat(e.target.value) || 0);
    }, [onAmountChange]);

    const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onReasonChange(e.target.value);
    }, [onReasonChange]);

    return (
        <Card className="border-orange-200">
            <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Manual Rate Override
                    </div>
                    <Switch
                        checked={enabled}
                        onCheckedChange={onEnabledChange}
                    />
                </CardTitle>
            </CardHeader>
            {enabled && (
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Anda mengaktifkan manual override. Rate otomatis akan diabaikan.
                            {calculatedRate && (
                                <span className="block mt-1">
                                    Rate terhitung: {formatCurrency(calculatedRate)}
                                </span>
                            )}
                        </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="override_amount">Total Amount Override *</Label>
                            <Input
                                id="override_amount"
                                type="number"
                                min="0"
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder="Masukkan total amount"
                            />
                            {errors.override_amount && (
                                <p className="text-red-500 text-sm mt-1">{errors.override_amount}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <Label htmlFor="override_reason">Alasan Override *</Label>
                            <Textarea
                                id="override_reason"
                                value={reason}
                                onChange={handleReasonChange}
                                placeholder="Jelaskan alasan menggunakan manual override..."
                                rows={3}
                            />
                            {errors.override_reason && (
                                <p className="text-red-500 text-sm mt-1">{errors.override_reason}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
});

export default RateOverrideSection;
