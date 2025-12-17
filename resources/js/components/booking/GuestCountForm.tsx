import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Bed, AlertCircle, Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
        <div className="space-y-4 w-full max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{t('booking.guest_count')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-muted/50 p-4 sm:p-6 rounded-lg border border-border text-center">
                <div className="space-y-1 flex flex-col items-center">
                    <Label htmlFor="guest_male" className="text-sm font-medium">{t('booking.male_adults')}</Label>
                    <div className="flex items-center gap-2">
                        {/* Tombol - */}
                        <button
                            type="button"
                            onClick={() => onGuestCountChange('male', Math.max(0, guestMale - 1))}
                            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted shrink-0 text-primary transition-colors"
                        >
                            <Minus className="h-5 w-5" />
                        </button>

                        {/* Input */}
                        <div className="w-20 shrink-0">
                            <Input
                                id="guest_male"
                                type="number"
                                min="0"
                                value={guestMale}
                                onChange={(e) => onGuestCountChange('male', parseInt(e.target.value) || 0)}
                                className={`h-12 text-center text-base ${errors?.guest_male ? 'border-red-500' : ''}`}
                            />
                        </div>

                        {/* Tombol + */}
                        <button
                            type="button"
                            onClick={() => onGuestCountChange('male', guestMale + 1)}
                            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted shrink-0 text-primary transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                    {errors?.guest_male && (
                        <p className="text-sm text-red-600">{errors.guest_male}</p>
                    )}
                </div>
                <div className="space-y-1 flex flex-col items-center">
                    <Label htmlFor="guest_female" className="text-sm font-medium">{t('booking.female_adults')}</Label>
                    <div className="flex items-center gap-2">
                        {/* Tombol - */}
                        <button
                            type="button"
                            onClick={() => onGuestCountChange('female', Math.max(0, guestFemale - 1))}
                            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted shrink-0 text-primary transition-colors"
                        >
                            <Minus className="h-5 w-5" />
                        </button>
                        <div className="w-20 shrink-0">
                            <Input
                                id="guest_female"
                                type="number"
                                min="0"
                                value={guestFemale}
                                onChange={(e) => onGuestCountChange('female', parseInt(e.target.value) || 0)}
                                className={`h-12 text-center text-base ${errors?.guest_female ? 'border-red-500' : ''}`}
                            />
                        </div>
                        {/* Tombol + */}
                        <button
                            type="button"
                            onClick={() => onGuestCountChange('female', guestFemale + 1)}
                            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted shrink-0 text-primary transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                    {errors?.guest_female && (
                        <p className="text-sm text-red-600">{errors.guest_female}</p>
                    )}
                </div>
                <div className="space-y-1 flex flex-col items-center">
                    <Label htmlFor="guest_children" className="text-sm font-medium">{t('booking.children')}</Label>
                    <div className="flex items-center gap-2">
                        {/* Tombol - */}
                        <button
                            type="button"
                            onClick={() => onGuestCountChange('children', Math.max(0, guestChildren - 1))}
                            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted shrink-0 text-primary transition-colors"
                        >
                            <Minus className="h-5 w-5" />
                        </button>
                        <div className="w-20 shrink-0">
                            <Input
                                id="guest_children"
                                type="number"
                                min="0"
                                value={guestChildren}
                                onChange={(e) => onGuestCountChange('children', parseInt(e.target.value) || 0)}
                                className={`h-12 text-center text-base ${errors?.guest_children ? 'border-red-500' : ''}`}
                            />
                        </div>
                        {/* Tombol + */}
                        <button
                            type="button"
                            onClick={() => onGuestCountChange('children', guestChildren + 1)}
                            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted shrink-0 text-primary transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                    {errors?.guest_children && (
                        <p className="text-sm text-red-600">{errors.guest_children}</p>
                    )}
                </div>
            </div>

            {/* Guest Count Summary */}
            <div className="bg-muted/50 p-4 sm:p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-base">{t('booking.total_guests')}:</span>
                    <Badge variant={guestCountError ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                        {totalGuests} guests
                    </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                    {t('booking.property_capacity')}: {capacity} - {capacityMax} {t('booking.guests')}
                </div>

                {extraBeds > 0 && (
                    <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-primary/10 rounded border border-primary/20">
                        <Bed className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{t('booking.extra_beds_needed')}: {extraBeds}</span>
                        <span className="text-muted-foreground">
                            (+Rp {(extraBeds * extraBedRate).toLocaleString("id-ID")}/night)
                        </span>
                    </div>
                )}

                {guestCountError && (
                    <Alert className="mt-3 border-red-500/20 bg-red-500/10">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-600">
                            {t('booking.guest_count_exceeds', { max: capacityMax })}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
