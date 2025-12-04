import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from '@/components/ui/date-range';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { usePage } from '@inertiajs/react';
import PrimaryGuestForm from './PrimaryGuestForm';
import GuestCountForm from './GuestCountForm';
import { toast } from 'sonner';
import axios from 'axios';

interface Property {
    id: number;
    name: string;
    capacity: number;
    capacity_max: number;
    base_rate: number;
    extra_bed_rate: number;
}

interface BookingManualInputDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

export default function BookingManualInputDialog({
    open,
    onClose,
    onSave,
    initialData
}: BookingManualInputDialogProps) {
    const [loading, setLoading] = useState(false);
    const [loadingRates, setLoadingRates] = useState(false);

    // Get properties from Inertia page props (same as Create.tsx)
    const { props: pageProps } = usePage<any>();
    const properties = Array.isArray(pageProps.properties) ? pageProps.properties : [];

    // Booking data state
    const [propertyId, setPropertyId] = useState<number | null>(null);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestGender, setGuestGender] = useState<'male' | 'female'>('male');
    const [guestCountry, setGuestCountry] = useState('Indonesia');
    const [guestMale, setGuestMale] = useState<number>(0);
    const [guestFemale, setGuestFemale] = useState<number>(0);
    const [guestChildren, setGuestChildren] = useState<number>(0);
    const [relationshipType, setRelationshipType] = useState<'keluarga' | 'teman' | 'kolega' | 'pasangan' | 'campuran'>('keluarga');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [dpPercentage, setDpPercentage] = useState<number>(50);
    const [paymentStatus, setPaymentStatus] = useState<string>('dp_pending');

    // Rate calculation state
    const [baseAmount, setBaseAmount] = useState<number>(0);
    const [nights, setNights] = useState<number>(0);
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [totalGuests, setTotalGuests] = useState<number>(0);
    const [extraBeds, setExtraBeds] = useState<number>(0);
    const [dpAmount, setDpAmount] = useState<number>(0);

    const [errors, setErrors] = useState<any>({});

    // Populate form with initialData
    useEffect(() => {
        if (open && initialData) {
            console.log('Populating with initialData:', initialData);

            // Property ID
            const propId = initialData.property_id ? parseInt(initialData.property_id) : null;
            setPropertyId(propId);

            // Guest info
            setGuestName(initialData.guest_name || '');
            setGuestEmail(initialData.guest_email || '');
            setGuestPhone(initialData.guest_phone || '');
            setGuestGender(initialData.guest_gender || 'male');
            setGuestCountry(initialData.guest_country || 'Indonesia');

            // Guest counts
            const parseMale = initialData.guest_male;
            const parseFemale = initialData.guest_female;
            const parseChildren = initialData.guest_children;

            setGuestMale(parseMale && parseMale !== '' ? parseInt(parseMale) : 0);
            setGuestFemale(parseFemale && parseFemale !== '' ? parseInt(parseFemale) : 0);
            setGuestChildren(parseChildren && parseChildren !== '' ? parseInt(parseChildren) : 0);

            setRelationshipType(initialData.relationship_type || 'keluarga');

            // Dates - convert to string format for DateRange
            if (initialData.check_in) {
                try {
                    const checkInDate = new Date(initialData.check_in);
                    if (!isNaN(checkInDate.getTime())) {
                        setCheckIn(format(checkInDate, 'yyyy-MM-dd'));
                    }
                } catch (e) {
                    console.error('Failed to parse check_in:', e);
                }
            }
            if (initialData.check_out) {
                try {
                    const checkOutDate = new Date(initialData.check_out);
                    if (!isNaN(checkOutDate.getTime())) {
                        setCheckOut(format(checkOutDate, 'yyyy-MM-dd'));
                    }
                } catch (e) {
                    console.error('Failed to parse check_out:', e);
                }
            }

            const parsedDp = initialData.dp_percentage;
            setDpPercentage(parsedDp && parsedDp !== '' ? parseInt(parsedDp) : 50);
            setPaymentStatus(initialData.payment_status || 'dp_pending');
        }
    }, [open, initialData]);

    // Calculate total guests and extra beds
    useEffect(() => {
        if (!Array.isArray(properties) || !propertyId) return;

        const selectedProperty = properties.find((p: Property) => p.id === propertyId);
        if (!selectedProperty) return;

        let effectiveGuests = guestMale + guestFemale + guestChildren;
        if (selectedProperty.capacity < selectedProperty.capacity_max) {
            effectiveGuests = guestMale + guestFemale + Math.floor(guestChildren / 2);
        }

        setTotalGuests(effectiveGuests);

        const beds = Math.max(0, effectiveGuests - selectedProperty.capacity);
        setExtraBeds(beds);

    }, [guestMale, guestFemale, guestChildren, propertyId, properties]);

    // Calculate rates when dates or property changes
    useEffect(() => {
        if (propertyId && checkIn && checkOut) {
            calculateRates();
        }
    }, [propertyId, checkIn, checkOut, guestMale, guestFemale, guestChildren]);

    // Calculate DP amount
    useEffect(() => {
        if (totalAmount && dpPercentage) {
            setDpAmount(Math.round(totalAmount * (dpPercentage / 100)));
        }
    }, [totalAmount, dpPercentage]);

    const calculateRates = async () => {
        if (!propertyId || !checkIn || !checkOut) return;

        setLoadingRates(true);
        try {
            const response = await axios.post('/api/admin/booking-management/calculate-rate', {
                property_id: propertyId,
                check_in: checkIn,
                check_out: checkOut,
                guest_male: guestMale,
                guest_female: guestFemale,
                guest_children: guestChildren,
            });

            setBaseAmount(response.data.base_amount || 0);
            setTotalAmount(response.data.total_amount || 0);
            setNights(response.data.nights || 0);
        } catch (error) {
            console.error('Failed to calculate rates:', error);
            toast.error('Failed to calculate rates');
        } finally {
            setLoadingRates(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: any = {};

        if (!propertyId) newErrors.property_id = 'Property is required';
        if (!guestName) newErrors.guest_name = 'Guest name is required';
        if (!guestEmail) newErrors.guest_email = 'Email is required';
        if (!guestPhone) newErrors.guest_phone = 'Phone is required';
        if (!guestCountry) newErrors.guest_country = 'Country is required';
        if (guestMale + guestFemale + guestChildren === 0) newErrors.guest_count = 'At least one guest is required';
        if (!relationshipType) newErrors.relationship_type = 'Relationship type is required';
        if (!checkIn) newErrors.check_in = 'Check-in date is required';
        if (!checkOut) newErrors.check_out = 'Check-out date is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validateForm()) {
            toast.error('Please fill in all required fields');
            return;
        }

        const data = {
            property_id: propertyId,
            guest_name: guestName,
            guest_email: guestEmail,
            guest_phone: guestPhone,
            guest_gender: guestGender,
            guest_country: guestCountry,
            guest_male: guestMale,
            guest_female: guestFemale,
            guest_children: guestChildren,
            relationship_type: relationshipType,
            check_in: checkIn,
            check_out: checkOut,
            nights: nights,
            base_amount: baseAmount,
            total_amount: totalAmount,
            dp_percentage: dpPercentage,
            dp_amount: dpAmount,
            payment_status: paymentStatus,
        };

        onSave(data);
        onClose();
    };

    const handleFieldChange = (field: string, value: any) => {
        switch (field) {
            case 'guest_name':
                setGuestName(value);
                break;
            case 'guest_email':
                setGuestEmail(value);
                break;
            case 'guest_phone':
                setGuestPhone(value);
                break;
            case 'guest_gender':
                setGuestGender(value);
                break;
            case 'guest_country':
                setGuestCountry(value);
                break;
            case 'relationship_type':
                setRelationshipType(value);
                break;
        }
    };

    const handleGuestCountChange = (genderType: 'male' | 'female' | 'children', newCount: number) => {
        switch (genderType) {
            case 'male':
                setGuestMale(newCount);
                break;
            case 'female':
                setGuestFemale(newCount);
                break;
            case 'children':
                setGuestChildren(newCount);
                break;
        }
    };

    const handleDateRangeChange = (startDate: string, endDate: string) => {
        setCheckIn(startDate);
        setCheckOut(endDate);
    };

    const selectedProperty = Array.isArray(properties) ? properties.find((p: Property) => p.id === propertyId) : null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Complete Booking Data</DialogTitle>
                    <DialogDescription>
                        Fill in the missing information for this booking. All fields marked with * are required.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Property Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="property">Property *</Label>
                        <Select
                            value={propertyId?.toString() || ''}
                            onValueChange={(val) => setPropertyId(parseInt(val))}
                        >
                            <SelectTrigger className={errors.property_id ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                                {properties.length === 0 ? (
                                    <SelectItem value="loading" disabled>No properties available</SelectItem>
                                ) : (
                                    properties.map((prop: Property) => (
                                        <SelectItem key={prop.id} value={prop.id.toString()}>
                                            {prop.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {errors.property_id && (
                            <p className="text-sm text-red-600">{errors.property_id}</p>
                        )}
                    </div>

                    {/* Guest Information */}
                    <PrimaryGuestForm
                        guestName={guestName}
                        guestEmail={guestEmail}
                        guestPhone={guestPhone}
                        guestGender={guestGender}
                        guestCountry={guestCountry}
                        relationshipType={relationshipType}
                        errors={errors}
                        onFieldChange={handleFieldChange}
                    />

                    {/* Guest Counts using GuestCountForm */}
                    {selectedProperty ? (
                        <GuestCountForm
                            guestMale={guestMale}
                            guestFemale={guestFemale}
                            guestChildren={guestChildren}
                            totalGuests={totalGuests}
                            extraBeds={extraBeds}
                            capacity={selectedProperty.capacity}
                            capacityMax={selectedProperty.capacity_max}
                            extraBedRate={selectedProperty.extra_bed_rate || 0}
                            errors={errors}
                            onGuestCountChange={handleGuestCountChange}
                        />
                    ) : (
                        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                                Please select a property first to input guest counts
                            </p>
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="space-y-2">
                        <Label>Check-in & Check-out Dates *</Label>
                        <DateRange
                            startDate={checkIn}
                            endDate={checkOut}
                            onDateChange={handleDateRangeChange}
                            error={errors.check_in || errors.check_out}
                        />
                        {(errors.check_in || errors.check_out) && (
                            <p className="text-sm text-red-600">{errors.check_in || errors.check_out}</p>
                        )}
                    </div>

                    {/* Rate Breakdown */}
                    {selectedProperty && checkIn && checkOut && (
                        <div className="border rounded-lg p-4 bg-muted/50">
                            <h3 className="text-lg font-semibold mb-3">Rate Calculation</h3>
                            {loadingRates ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Nights:</span>
                                        <span className="font-medium">{nights}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Base Amount:</span>
                                        <span className="font-medium">Rp {baseAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                        <span className="font-semibold">Total:</span>
                                        <span className="font-semibold">Rp {totalAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>DP ({dpPercentage}%):</span>
                                        <span>Rp {dpAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment - Read only for imports */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dp_percentage">DP Percentage (Fixed for import)</Label>
                            <Input
                                id="dp_percentage"
                                type="number"
                                value={dpPercentage}
                                readOnly
                                disabled
                                className="h-12 text-base bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">Imports always use 50% DP</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment_status">Payment Status (Fixed for import)</Label>
                            <Input
                                id="payment_status"
                                value="DP Pending"
                                readOnly
                                disabled
                                className="h-12 text-base bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">Imports always use DP Pending status</p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
