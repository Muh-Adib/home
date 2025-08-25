import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

interface PrimaryGuestFormProps {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    guestGender: 'male' | 'female';
    guestCountry: string;
    relationshipType: 'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran';
    errors?: {
        guest_name?: string;
        guest_email?: string;
        guest_phone?: string;
        guest_gender?: string;
        guest_country?: string;
        relationship_type?: string;
    };
    onFieldChange: (field: string, value: any) => void;
}

const countries = [
    'Indonesia', 'Singapore', 'Malaysia', 'Thailand', 'Philippines', 'Vietnam',
    'Cambodia', 'Laos', 'Myanmar', 'Brunei', 'Australia', 'New Zealand',
    'Japan', 'South Korea', 'China', 'India', 'United States', 'United Kingdom',
    'Germany', 'France', 'Netherlands', 'Other'
];

const relationshipOptions = [
    { value: 'keluarga', label: 'Family' },
    { value: 'teman', label: 'Friends' },
    { value: 'kolega', label: 'Colleagues' },
    { value: 'pasangan', label: 'Couple' },
    { value: 'campuran', label: 'Mixed' },
];

export default function PrimaryGuestForm({
    guestName,
    guestEmail,
    guestPhone,
    guestGender,
    guestCountry,
    relationshipType,
    errors,
    onFieldChange
}: PrimaryGuestFormProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{t('booking.primary_guest')}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="guest_name" className="text-sm font-medium text-foreground">{t('booking.full_name')} *</Label>
                    <Input
                        id="guest_name"
                        type="text"
                        value={guestName}
                        onChange={(e) => onFieldChange('guest_name', e.target.value)}
                        className={`h-12 text-base ${errors?.guest_name ? 'border-red-500' : ''}`}
                        placeholder={t('booking.enter_full_name')}
                    />
                    {errors?.guest_name && (
                        <p className="text-sm text-red-600">{errors.guest_name}</p>
                    )}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="guest_gender" className="text-sm font-medium text-foreground">{t('booking.gender')} *</Label>
                    <Select
                        value={guestGender}
                        onValueChange={(value: 'male' | 'female') => onFieldChange('guest_gender', value)}
                    >
                        <SelectTrigger className={`h-12 text-base ${errors?.guest_gender ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">{t('booking.male')}</SelectItem>
                            <SelectItem value="female">{t('booking.female')}</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors?.guest_gender && (
                        <p className="text-sm text-red-600">{errors.guest_gender}</p>
                    )}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="guest_phone" className="text-sm font-medium text-foreground">{t('booking.phone_number')}*</Label>
                    <Input
                        id="guest_phone"
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => onFieldChange('guest_phone', e.target.value)}
                        className={`h-12 text-base ${errors?.guest_phone ? 'border-red-500' : ''}`}
                        placeholder="628xxx"
                    />
                    {errors?.guest_phone && (
                        <p className="text-sm text-red-600">{errors.guest_phone}</p>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="guest_email" className="text-sm font-medium text-foreground">{t('booking.email_address')} *</Label>
                    <Input
                        id="guest_email"
                        type="email"
                        value={guestEmail}
                        onChange={(e) => onFieldChange('guest_email', e.target.value)}
                        className={`h-12 text-base ${errors?.guest_email ? 'border-red-500' : ''}`}
                        placeholder="your@email.com"
                    />
                    {errors?.guest_email && (
                        <p className="text-sm text-red-600">{errors.guest_email}</p>
                    )}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="guest_country" className="text-sm font-medium text-foreground">{t('booking.country')} *</Label>
                    <Select 
                        value={guestCountry} 
                        onValueChange={(value: string) => onFieldChange('guest_country', value)}
                    >
                        <SelectTrigger className={`h-12 text-base ${errors?.guest_country ? 'border-red-500' : ''}`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {countries.map(country => (
                                <SelectItem key={country} value={country}>
                                    {country}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors?.guest_country && (
                        <p className="text-sm text-red-600">{errors.guest_country}</p>
                    )}
                </div>
            </div>

            {/* Group Relationship */}
            <div className="space-y-3">
                <Label htmlFor="relationship_type" className="text-base font-medium text-foreground">{t('booking.guest_relationship')} *</Label>
                <Select 
                    value={relationshipType} 
                    onValueChange={(value: string) => onFieldChange('relationship_type', value)}
                >
                    <SelectTrigger className={`h-12 text-base ${errors?.relationship_type ? 'border-red-500' : ''}`}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {relationshipOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors?.relationship_type && (
                    <p className="text-sm text-red-600">{errors.relationship_type}</p>
                )}
            </div>
        </div>
    );
}
