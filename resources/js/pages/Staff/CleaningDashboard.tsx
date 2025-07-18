import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
    CheckCircle, 
    Clock, 
    MapPin, 
    Users, 
    Key, 
    AlertTriangle,
    Calendar,
    User,
    Sparkles,
    RefreshCw
} from 'lucide-react';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface CleaningProperty {
    id: number;
    booking_number: string;
    property_name: string;
    property_address: string;
    guest_name: string;
    guest_count: number;
    check_out: string;
    current_keybox_code: string | null;
    next_checkin: {
        check_in: string;
        guest_name: string;
    } | null;
    priority: 'high' | 'medium' | 'low';
}

interface RecentlyCleaned {
    id: number;
    booking_number: string;
    property: {
        name: string;
        current_keybox_code: string;
        keybox_updated_at: string;
    };
    cleanedBy: {
        name: string;
    };
    cleaned_at: string;
}

interface CleaningStats {
    total_checkout_today: number;
    cleaned_today: number;
    pending_cleaning: number;
    high_priority: number;
}

interface CleaningDashboardProps extends PageProps {
    needsCleaning: CleaningProperty[];
    recentlyCleaned: RecentlyCleaned[];
    stats: CleaningStats;
}

export default function CleaningDashboard({ needsCleaning, recentlyCleaned, stats }: CleaningDashboardProps) {
    const [selectedProperty, setSelectedProperty] = useState<CleaningProperty | null>(null);
    const [showCleaningForm, setShowCleaningForm] = useState(false);
    
    const { data, setData, patch, processing, errors, reset } = useForm({
        new_keybox_code: '',
        notes: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/admin/dashboard' },
        { title: 'Cleaning Management', href: '/staff/cleaning' },
    ];

    const openCleaningForm = (property: CleaningProperty) => {
        setSelectedProperty(property);
        reset();
        setShowCleaningForm(true);
    };

    const closeCleaningForm = () => {
        setShowCleaningForm(false);
        setSelectedProperty(null);
        reset();
    };

    const submitCleaning = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProperty) return;

        patch(route('staff.cleaning.mark-cleaned', selectedProperty.id), {
            onSuccess: () => {
                closeCleaningForm();
            },
            preserveScroll: true,
        });
    };

    const getPriorityBadge = (priority: string) => {
        const variants = {
            high: 'destructive',
            medium: 'default',
            low: 'secondary'
        } as const;
        
        const labels = {
            high: 'High Priority',
            medium: 'Medium',
            low: 'Low'
        } as const;

        return (
            <Badge variant={variants[priority as keyof typeof variants]}>
                {labels[priority as keyof typeof labels]}
            </Badge>
        );
    };

    const formatTime = (dateString: string) => {
        return format(new Date(dateString), 'HH:mm', { locale: id });
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'dd MMM yyyy', { locale: id });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cleaning Dashboard" />
            
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Cleaning Dashboard
                        </h1>
                        <p className="text-muted-foreground">
                            Manage property cleaning and keybox codes
                        </p>
                    </div>
                    
                    <Button 
                        onClick={() => window.location.reload()} 
                        variant="outline"
                        size="sm"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Checkout Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-2xl font-bold">{stats.total_checkout_today}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pending Cleaning
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-500" />
                                <span className="text-2xl font-bold">{stats.pending_cleaning}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                High Priority
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-2xl font-bold">{stats.high_priority}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Cleaned Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-2xl font-bold">{stats.cleaned_today}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Properties Needing Cleaning */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Properties Need Cleaning ({needsCleaning.length})
                        </CardTitle>
                        <CardDescription>
                            Properties that checked out today and need cleaning
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {needsCleaning.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold">All Clean!</h3>
                                <p className="text-muted-foreground">No properties need cleaning today.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {needsCleaning.map((property) => (
                                    <Card key={property.id} className="border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{property.property_name}</h3>
                                                        {getPriorityBadge(property.priority)}
                                                    </div>
                                                    
                                                    <div className="space-y-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4" />
                                                            {property.property_address}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4" />
                                                            {property.guest_name} • {property.guest_count} guests
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            Checked out: {formatDate(property.check_out)}
                                                        </div>
                                                        {property.current_keybox_code && (
                                                            <div className="flex items-center gap-2">
                                                                <Key className="h-4 w-4" />
                                                                Current keybox: <code className="bg-muted px-1 rounded text-xs">{property.current_keybox_code}</code>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {property.next_checkin && (
                                                        <Alert>
                                                            <AlertTriangle className="h-4 w-4" />
                                                            <AlertDescription>
                                                                Next guest: <strong>{property.next_checkin.guest_name}</strong> checking in {formatDate(property.next_checkin.check_in)}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </div>
                                                
                                                <Button 
                                                    onClick={() => openCleaningForm(property)}
                                                    className="bg-green-500 hover:bg-green-600"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Mark as Cleaned
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recently Cleaned */}
                {recentlyCleaned.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Recently Cleaned ({recentlyCleaned.length})
                            </CardTitle>
                            <CardDescription>
                                Properties cleaned today
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentlyCleaned.map((cleaned) => (
                                    <div key={cleaned.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <p className="font-medium">{cleaned.property.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Cleaned by {cleaned.cleanedBy.name} at {formatTime(cleaned.cleaned_at)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Key className="h-4 w-4" />
                                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                                    {cleaned.property.current_keybox_code}
                                                </code>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Updated {formatTime(cleaned.property.keybox_updated_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cleaning Form Modal */}
                <Dialog open={showCleaningForm} onOpenChange={setShowCleaningForm}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Mark Property as Cleaned</DialogTitle>
                        </DialogHeader>
                        
                        {selectedProperty && (
                            <>
                                <div className="space-y-2 mb-4">
                                    <p className="text-sm">
                                        <strong>Property:</strong> {selectedProperty.property_name}
                                    </p>
                                    <p className="text-sm">
                                        <strong>Guest:</strong> {selectedProperty.guest_name}
                                    </p>
                                    {selectedProperty.current_keybox_code && (
                                        <p className="text-sm">
                                            <strong>Current Keybox:</strong> 
                                            <code className="bg-muted px-1 rounded ml-1 text-xs">
                                                {selectedProperty.current_keybox_code}
                                            </code>
                                        </p>
                                    )}
                                </div>
                                
                                <Separator />
                                
                                <form onSubmit={submitCleaning} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new_keybox_code">
                                            New Keybox Code <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="new_keybox_code"
                                            type="text"
                                            maxLength={3}
                                            pattern="\d{3}"
                                            value={data.new_keybox_code}
                                            onChange={(e) => setData('new_keybox_code', e.target.value.replace(/\D/g, '').slice(0, 3))}
                                            placeholder="123"
                                            className={errors.new_keybox_code ? 'border-red-500' : ''}
                                            required
                                        />
                                        {errors.new_keybox_code && (
                                            <p className="text-sm text-red-500">{errors.new_keybox_code}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Enter the 3-digit code from the physical keybox
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Cleaning Notes (Optional)</Label>
                                        <Textarea
                                            id="notes"
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            placeholder="Any notes about the cleaning..."
                                            rows={3}
                                        />
                                        {errors.notes && (
                                            <p className="text-sm text-red-500">{errors.notes}</p>
                                        )}
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button 
                                            type="button" 
                                            onClick={closeCleaningForm}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            type="submit"
                                            disabled={processing || !data.new_keybox_code}
                                            className="flex-1 bg-green-500 hover:bg-green-600"
                                        >
                                            {processing ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Mark as Cleaned
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}