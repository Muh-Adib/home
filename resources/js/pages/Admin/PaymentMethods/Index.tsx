import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    CreditCard,
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    Eye,
    ToggleLeft,
    ToggleRight,
    Building2,
    Smartphone,
    Banknote,
    DollarSign,
    Settings,
    ArrowUpDown,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'bank_transfer' | 'e_wallet' | 'credit_card' | 'cash';
    icon: string;
    description?: string;
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    qr_code?: string;
    instructions: string[];
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface PaymentMethodsIndexProps {
    paymentMethods: {
        data: PaymentMethod[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        prev_page_url?: string;
        next_page_url?: string;
    };
    stats: {
        total: number;
        active: number;
        bank_transfers: number;
        e_wallets: number;
    };
    filters: {
        search?: string;
        type?: string;
        status?: string;
    };
}

export default function PaymentMethodsIndex({ paymentMethods, stats, filters }: PaymentMethodsIndexProps) {
    const [search, setSearch] = useState(filters?.search || '');
    const [typeFilter, setTypeFilter] = useState(filters?.type || 'all');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { processing, delete: deleteMethod } = useForm();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payment Methods', href: '#' },
    ];

    const handleSearch = () => {
        const params: any = {};
        if (search) params.search = search;
        if (typeFilter !== 'all') params.type = typeFilter;
        if (statusFilter !== 'all') params.status = statusFilter;

        router.get('/admin/payment-methods', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('all');
        setStatusFilter('all');
        router.get('/admin/payment-methods');
    };

    const handleToggle = (method: PaymentMethod) => {
        router.put(`/admin/payment-methods/${method.id}/toggle`, {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (selectedMethod) {
            deleteMethod(`/admin/payment-methods/${selectedMethod.id}`, {
                onSuccess: () => {
                    setShowDeleteDialog(false);
                    setSelectedMethod(null);
                }
            });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bank_transfer': return <Building2 className="h-4 w-4" />;
            case 'e_wallet': return <Smartphone className="h-4 w-4" />;
            case 'credit_card': return <CreditCard className="h-4 w-4" />;
            case 'cash': return <Banknote className="h-4 w-4" />;
            default: return <DollarSign className="h-4 w-4" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'bank_transfer': return 'bg-blue-100 text-blue-800';
            case 'e_wallet': return 'bg-green-100 text-green-800';
            case 'credit_card': return 'bg-purple-100 text-purple-800';
            case 'cash': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'bank_transfer': return 'Bank Transfer';
            case 'e_wallet': return 'E-Wallet';
            case 'credit_card': return 'Credit Card';
            case 'cash': return 'Cash';
            default: return type;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payment Methods - Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
                        <p className="text-gray-600 mt-1">
                            Manage payment methods for bookings
                        </p>
                    </div>
                    <Link href="/admin/payment-methods/create">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Payment Method
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Methods</p>
                                    <p className="text-2xl font-bold">{stats?.total}</p>
                                </div>
                                <Settings className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Active Methods</p>
                                    <p className="text-2xl font-bold text-green-600">{stats?.active}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Bank Transfers</p>
                                    <p className="text-2xl font-bold text-blue-600">{stats?.bank_transfers}</p>
                                </div>
                                <Building2 className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">E-Wallets</p>
                                    <p className="text-2xl font-bold text-green-600">{stats?.e_wallets}</p>
                                </div>
                                <Smartphone className="h-8 w-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Filter */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search payment methods..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="e_wallet">E-Wallet</SelectItem>
                                    <SelectItem value="credit_card">Credit Card</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex gap-2">
                                <Button onClick={handleSearch}>
                                    Search
                                </Button>
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Methods List */}
                <div className="space-y-4">
                    {paymentMethods?.data?.length > 0 ? (
                        paymentMethods?.data?.map((method) => (
                            <Card key={method.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100">
                                                {method.icon ? (
                                                    <span className="text-2xl">{method.icon}</span>
                                                ) : (
                                                    getTypeIcon(method.type)
                                                )}
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-semibold">{method.name}</h3>
                                                    <Badge className={getTypeColor(method.type)}>
                                                        {getTypeLabel(method.type)}
                                                    </Badge>
                                                    {method.is_active ? (
                                                        <Badge variant="outline" className="text-green-600 border-green-200">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-red-600 border-red-200">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </div>
                                                
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {method.description || 'No description'}
                                                </p>
                                                
                                                {method.account_number && (
                                                    <div className="text-sm text-gray-500">
                                                        <span className="font-medium">
                                                            {method.bank_name && `${method.bank_name}: `}
                                                        </span>
                                                        {method.account_number}
                                                        {method.account_name && ` (${method.account_name})`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`toggle-${method.id}`} className="text-sm">
                                                    {method.is_active ? 'Active' : 'Inactive'}
                                                </Label>
                                                <Switch
                                                    id={`toggle-${method.id}`}
                                                    checked={method.is_active}
                                                    onCheckedChange={() => handleToggle(method)}
                                                />
                                            </div>
                                            
                                            <Link href={`/admin/payment-methods/${method.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            
                                            <Link href={`/admin/payment-methods/${method.id}/edit`}>
                                                <Button variant="ghost" size="sm">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedMethod(method);
                                                    setShowDeleteDialog(true);
                                                }}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    No payment methods found
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Create your first payment method to start accepting payments
                                </p>
                                <Link href="/admin/payment-methods/create">
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Payment Method
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Pagination */}
                {paymentMethods.last_page > 1 && (
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2">
                            {paymentMethods.prev_page_url && (
                                <Link href={paymentMethods.prev_page_url}>
                                    <Button variant="outline">Previous</Button>
                                </Link>
                            )}

                            <span className="px-4 py-2 text-sm text-gray-600">
                                Page {paymentMethods.current_page} of {paymentMethods.last_page}
                            </span>

                            {paymentMethods.next_page_url && (
                                <Link href={paymentMethods.next_page_url}>
                                    <Button variant="outline">Next</Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Payment Method</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p>Are you sure you want to delete this payment method?</p>
                            {selectedMethod && (
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="font-medium">{selectedMethod.name}</p>
                                    <p className="text-sm text-gray-600">{selectedMethod.description}</p>
                                </div>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={handleDelete}
                                    disabled={processing}
                                >
                                    {processing ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
} 