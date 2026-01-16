/**
 * Guest Information Form Component
 * Configurable guest data collection form
 * Reusable for both admin (full form) and public (subset) contexts
 * Optimized with React.memo
 */

import React, { memo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface GuestFormData {
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number: string;
    guest_gender: string;
    relationship_type: string;
    special_requests: string;
    internal_notes: string;
}

export interface GuestInformationFormProps {
    values: Partial<GuestFormData>;
    onChange: (field: keyof GuestFormData, value: string) => void;
    errors?: Partial<Record<keyof GuestFormData, string>>;
    showInternalNotes?: boolean;
    fieldConfig?: {
        showIdNumber?: boolean;
        showGender?: boolean;
        showRelationshipType?: boolean;
        showSpecialRequests?: boolean;
    };
}

const GuestInformationForm = memo(function GuestInformationForm({
    values,
    onChange,
    errors = {},
    showInternalNotes = true,
    fieldConfig = {
        showIdNumber: true,
        showGender: true,
        showRelationshipType: true,
        showSpecialRequests: true,
    },
}: GuestInformationFormProps) {
    // Memoized handler factory to prevent recreation
    const createChangeHandler = useCallback((field: keyof GuestFormData) => {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            onChange(field, e.target.value);
        };
    }, [onChange]);

    const createSelectHandler = useCallback((field: keyof GuestFormData) => {
        return (value: string) => {
            onChange(field, value);
        };
    }, [onChange]);

    return (
        <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="guest_name">Nama Lengkap *</Label>
                    <Input
                        id="guest_name"
                        value={values.guest_name || ''}
                        onChange={createChangeHandler('guest_name')}
                        placeholder="Nama tamu utama"
                    />
                    {errors.guest_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.guest_name}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="guest_email">Email *</Label>
                    <Input
                        id="guest_email"
                        type="email"
                        value={values.guest_email || ''}
                        onChange={createChangeHandler('guest_email')}
                        placeholder="email@example.com"
                    />
                    {errors.guest_email && (
                        <p className="text-red-500 text-sm mt-1">{errors.guest_email}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="guest_phone">Phone *</Label>
                    <Input
                        id="guest_phone"
                        type="tel"
                        value={values.guest_phone || ''}
                        onChange={createChangeHandler('guest_phone')}
                        placeholder="+62xxx"
                    />
                    {errors.guest_phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.guest_phone}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="guest_country">Country *</Label>
                    <Select
                        value={values.guest_country || 'Indonesia'}
                        onValueChange={createSelectHandler('guest_country')}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Indonesia">Indonesia</SelectItem>
                            <SelectItem value="Malaysia">Malaysia</SelectItem>
                            <SelectItem value="Singapore">Singapore</SelectItem>
                            <SelectItem value="Thailand">Thailand</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Optional Fields - Configurable */}
                {fieldConfig.showIdNumber && (
                    <div>
                        <Label htmlFor="guest_id_number">Nomor ID/KTP</Label>
                        <Input
                            id="guest_id_number"
                            value={values.guest_id_number || ''}
                            onChange={createChangeHandler('guest_id_number')}
                            placeholder="Nomor KTP/Passport"
                        />
                    </div>
                )}

                {fieldConfig.showGender && (
                    <div>
                        <Label htmlFor="guest_gender">Jenis Kelamin *</Label>
                        <Select
                            value={values.guest_gender || 'male'}
                            onValueChange={createSelectHandler('guest_gender')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih jenis kelamin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Laki-laki</SelectItem>
                                <SelectItem value="female">Perempuan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {fieldConfig.showRelationshipType && (
                    <div>
                        <Label htmlFor="relationship_type">Tipe Hubungan</Label>
                        <Select
                            value={values.relationship_type || 'keluarga'}
                            onValueChange={createSelectHandler('relationship_type')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih tipe hubungan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="keluarga">Keluarga</SelectItem>
                                <SelectItem value="teman">Teman</SelectItem>
                                <SelectItem value="kolega">Kolega</SelectItem>
                                <SelectItem value="pasangan">Pasangan</SelectItem>
                                <SelectItem value="campuran">Campuran</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Notes Section */}
            {fieldConfig.showSpecialRequests && (
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="special_requests">Permintaan Khusus</Label>
                        <Textarea
                            id="special_requests"
                            value={values.special_requests || ''}
                            onChange={createChangeHandler('special_requests')}
                            placeholder="Permintaan khusus dari tamu..."
                            rows={3}
                        />
                    </div>

                    {showInternalNotes && (
                        <div>
                            <Label htmlFor="internal_notes">Catatan Internal</Label>
                            <Textarea
                                id="internal_notes"
                                value={values.internal_notes || ''}
                                onChange={createChangeHandler('internal_notes')}
                                placeholder="Catatan internal (tidak terlihat oleh tamu)..."
                                rows={3}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default GuestInformationForm;
