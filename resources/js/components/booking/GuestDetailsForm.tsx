import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    User, 
    Users, 
    Mail, 
    Phone, 
    MessageCircle, 
    Globe, 
    CreditCard,
    AlertCircle,
    CheckCircle,
    Plus,
    Minus,
    RefreshCw
} from 'lucide-react';
import { useGuestDetails, UseGuestDetailsProps } from '@/hooks/use-guest-details';

interface GuestDetailsFormProps extends UseGuestDetailsProps {
    expectedGuestCount: number;
    errors?: Record<string, string>;
    disabled?: boolean;
    showAdvancedFields?: boolean;
    onDataChange?: (data: any) => void;
    isCheckingEmail?: boolean;
    onEmailChange?: (email: string) => void;
    showLoginNotice?: boolean;
    className?: string;
}

export function GuestDetailsForm({
    expectedGuestCount,
    errors = {},
    disabled = false,
    showAdvancedFields = false,
    onDataChange,
    isCheckingEmail = false,
    onEmailChange,
    showLoginNotice = false,
    className = '',
    ...hookProps
}: GuestDetailsFormProps) {
    
    const guestDetails = useGuestDetails({
        initialGuestCount: expectedGuestCount,
        ...hookProps
    });

    const { state, actions, computed } = guestDetails;

    // Notify parent component of data changes
    React.useEffect(() => {
        if (onDataChange) {
            onDataChange(computed.getFormData());
        }
    }, [state, onDataChange]);

    const handleEmailChange = (email: string) => {
        actions.updatePrimaryGuest({ email });
        if (onEmailChange) {
            onEmailChange(email);
        }
    };

    const countries = [
        'Indonesia',
        'Malaysia',
        'Singapore',
        'Thailand',
        'Philippines',
        'Vietnam',
        'Australia',
        'New Zealand',
        'United States',
        'United Kingdom',
        'Japan',
        'South Korea',
        'China',
        'India',
        'Other'
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Primary Guest Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Primary Guest Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label htmlFor="guest_name">
                                Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="guest_name"
                                type="text"
                                value={state.primaryGuest.name}
                                onChange={(e) => actions.updatePrimaryGuest({ name: e.target.value })}
                                placeholder="Enter your full name"
                                className={errors.guest_name ? 'border-red-500' : ''}
                                disabled={disabled}
                                required
                            />
                            {errors.guest_name && (
                                <p className="text-sm text-red-500">{errors.guest_name}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="guest_email">
                                Email Address <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="guest_email"
                                    type="email"
                                    value={state.primaryGuest.email}
                                    onChange={(e) => handleEmailChange(e.target.value)}
                                    placeholder="your@email.com"
                                    className={errors.guest_email ? 'border-red-500' : ''}
                                    disabled={disabled}
                                    required
                                />
                                {isCheckingEmail && (
                                    <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            {errors.guest_email && (
                                <p className="text-sm text-red-500">{errors.guest_email}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="guest_phone">
                                Phone Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="guest_phone"
                                type="tel"
                                value={state.primaryGuest.phone}
                                onChange={(e) => actions.updatePrimaryGuest({ phone: e.target.value })}
                                placeholder="+62 812-3456-7890"
                                className={errors.guest_phone ? 'border-red-500' : ''}
                                disabled={disabled}
                                required
                            />
                            {errors.guest_phone && (
                                <p className="text-sm text-red-500">{errors.guest_phone}</p>
                            )}
                        </div>

                        {/* WhatsApp */}
                        <div className="space-y-2">
                            <Label htmlFor="guest_whatsapp">
                                WhatsApp Number
                            </Label>
                            <Input
                                id="guest_whatsapp"
                                type="tel"
                                value={state.primaryGuest.whatsapp}
                                onChange={(e) => actions.updatePrimaryGuest({ whatsapp: e.target.value })}
                                placeholder="+62 812-3456-7890"
                                className={errors.guest_whatsapp ? 'border-red-500' : ''}
                                disabled={disabled}
                            />
                            {errors.guest_whatsapp && (
                                <p className="text-sm text-red-500">{errors.guest_whatsapp}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                For booking confirmations and updates (defaults to phone number)
                            </p>
                        </div>
                    </div>

                    {/* Advanced Fields */}
                    {showAdvancedFields && (
                        <>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Country */}
                                <div className="space-y-2">
                                    <Label htmlFor="guest_country">Country</Label>
                                    <Select 
                                        value={state.primaryGuest.country} 
                                        onValueChange={(value) => actions.updatePrimaryGuest({ country: value })}
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries.map((country) => (
                                                <SelectItem key={country} value={country}>
                                                    {country}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Gender */}
                                <div className="space-y-2">
                                    <Label htmlFor="guest_gender">Gender</Label>
                                    <Select 
                                        value={state.primaryGuest.gender} 
                                        onValueChange={(value: any) => actions.updatePrimaryGuest({ gender: value })}
                                        disabled={disabled}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* ID Number */}
                                <div className="space-y-2">
                                    <Label htmlFor="guest_id_number">ID Number (Optional)</Label>
                                    <Input
                                        id="guest_id_number"
                                        type="text"
                                        value={state.primaryGuest.id_number}
                                        onChange={(e) => actions.updatePrimaryGuest({ id_number: e.target.value })}
                                        placeholder="KTP/Passport number"
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Guest Count Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Guest Details
                        <Badge variant="outline" className="ml-auto">
                            {computed.actualGuestCount} of {state.guestCount.total} guests
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        {/* Male Adults */}
                        <div className="space-y-2">
                            <Label htmlFor="male_count">Male Adults</Label>
                            <div className="flex items-center space-x-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => actions.updateGuestCount('male', Math.max(0, state.guestCount.male - 1))}
                                    disabled={disabled || state.guestCount.male <= 0}
                                    className="h-9 w-9 p-0"
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    value={state.guestCount.male}
                                    onChange={(e) => actions.updateGuestCount('male', parseInt(e.target.value) || 0)}
                                    className="text-center"
                                    min="0"
                                    max={state.guestCount.total}
                                    disabled={disabled}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => actions.updateGuestCount('male', Math.min(state.guestCount.total, state.guestCount.male + 1))}
                                    disabled={disabled || computed.actualGuestCount >= state.guestCount.total}
                                    className="h-9 w-9 p-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Female Adults */}
                        <div className="space-y-2">
                            <Label htmlFor="female_count">Female Adults</Label>
                            <div className="flex items-center space-x-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => actions.updateGuestCount('female', Math.max(0, state.guestCount.female - 1))}
                                    disabled={disabled || state.guestCount.female <= 0}
                                    className="h-9 w-9 p-0"
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    value={state.guestCount.female}
                                    onChange={(e) => actions.updateGuestCount('female', parseInt(e.target.value) || 0)}
                                    className="text-center"
                                    min="0"
                                    max={state.guestCount.total}
                                    disabled={disabled}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => actions.updateGuestCount('female', Math.min(state.guestCount.total, state.guestCount.female + 1))}
                                    disabled={disabled || computed.actualGuestCount >= state.guestCount.total}
                                    className="h-9 w-9 p-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Children */}
                        <div className="space-y-2">
                            <Label htmlFor="children_count">Children</Label>
                            <div className="flex items-center space-x-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => actions.updateGuestCount('children', Math.max(0, state.guestCount.children - 1))}
                                    disabled={disabled || state.guestCount.children <= 0}
                                    className="h-9 w-9 p-0"
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    value={state.guestCount.children}
                                    onChange={(e) => actions.updateGuestCount('children', parseInt(e.target.value) || 0)}
                                    className="text-center"
                                    min="0"
                                    max={state.guestCount.total}
                                    disabled={disabled}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => actions.updateGuestCount('children', Math.min(state.guestCount.total, state.guestCount.children + 1))}
                                    disabled={disabled || computed.actualGuestCount >= state.guestCount.total}
                                    className="h-9 w-9 p-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Validation Alert */}
                    {!computed.isGuestCountValid && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Guest breakdown must total {state.guestCount.total} guests. 
                                Current total: {computed.actualGuestCount}
                            </AlertDescription>
                        </Alert>
                    )}

                    {computed.isGuestCountValid && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                                Guest count is valid ✓
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Guest List Preview */}
                    {state.guests.length > 0 && showAdvancedFields && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Guest List Preview</Label>
                                <div className="space-y-2">
                                    {state.guests.map((guest, index) => (
                                        <div key={guest.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={guest.age_group === 'child' ? 'secondary' : 'default'}>
                                                    {index + 1}
                                                </Badge>
                                                <span className="font-medium">{guest.name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {guest.gender} {guest.age_group}
                                                </Badge>
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {guest.relationship}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Login Notice (for existing users) */}
            {showLoginNotice && (
                <Alert className="border-blue-200 bg-blue-50">
                    <User className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                        We found an existing account with this email. You can continue as guest or login for faster checkout.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}