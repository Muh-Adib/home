import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Users, Bed, AlertCircle, Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface GuestCountFormProps {
    guestMale: number;
    guestFemale: number;
    guestChildren: number;
    totalGuests: number;
    extraBeds: number;
    capacity: number;
    capacityMax: number;
    extraBedRate: number;
    errors?: {
        guest_male?: string;
        guest_female?: string;
        guest_children?: string;
    };
    onGuestCountChange: (genderType: 'male' | 'female' | 'children', newCount: number) => void;
}

interface GuestCounterProps {
    label: string;
    value: number;
    onChange: (newValue: number) => void;
    error?: string;
    min?: number;
}

const GuestCounter = ({ label, value, onChange, error, min = 0 }: GuestCounterProps) => (
    <div className="flex flex-col gap-2 items-center">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
        </label>
        <div className="flex items-center gap-3">
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={value <= min}
            >
                <Minus className="h-4 w-4" />
                <span className="sr-only">Decrease {label}</span>
            </Button>
            <div className="w-12 text-center font-medium tabular-nums">
                {value}
            </div>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => onChange(value + 1)}
            >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Increase {label}</span>
            </Button>
        </div>
        {error && <span className="text-[0.8rem] font-medium text-destructive">{error}</span>}
    </div>
);

export default function GuestCountForm({
    guestMale,
    guestFemale,
    guestChildren,
    totalGuests,
    extraBeds,
    capacity,
    capacityMax,
    extraBedRate,
    errors,
    onGuestCountChange
}: GuestCountFormProps) {
    const { t } = useTranslation();
    const guestCountError = totalGuests > capacityMax;

    return (
        <Card className="w-full shadow-sm gap-0">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold">{t('booking.guest_count')}</CardTitle>
                            <CardDescription className="text-xs">
                                {t('booking.property_capacity')}: {capacity} - {capacityMax} {t('booking.guests')}
                            </CardDescription>
                        </div>
                    </div>
                    <Badge variant={guestCountError ? "destructive" : "secondary"} className="text-sm px-2.5 py-0.5">
                        {totalGuests} {t('booking.guests')}
                    </Badge>
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="grid py-6">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center justify-center pb-6">
                    <GuestCounter
                        label={t('booking.male_adults')}
                        value={guestMale}
                        onChange={(val) => onGuestCountChange('male', val)}
                        error={errors?.guest_male}
                    />
                    <GuestCounter
                        label={t('booking.female_adults')}
                        value={guestFemale}
                        onChange={(val) => onGuestCountChange('female', val)}
                        error={errors?.guest_female}
                    />
                    <GuestCounter
                        label={t('booking.children')}
                        value={guestChildren}
                        onChange={(val) => onGuestCountChange('children', val)}
                        error={errors?.guest_children}
                    />
                </div>

                {/* Summary / Alerts Section */}
                <div className="space-y-3 pt-2">
                    {extraBeds > 0 && (
                        <div className="flex items-center justify-between text-sm px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md text-amber-900 dark:text-amber-200">
                            <div className="flex items-center gap-2">
                                <Bed className="h-4 w-4" />
                                <span className="font-medium">{t('booking.extra_beds_needed')}: {extraBeds}</span>
                            </div>
                            <span className="text-xs font-medium bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded-full">
                                +Rp {(extraBeds * extraBedRate).toLocaleString("id-ID")}
                            </span>
                        </div>
                    )}

                    {guestCountError && (
                        <Alert variant="destructive" className="py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {t('booking.guest_count_exceeds', { max: capacityMax })}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
