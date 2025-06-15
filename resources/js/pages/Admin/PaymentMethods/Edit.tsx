import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    ArrowLeft,
    CreditCard,
    Upload,
    Building2,
    Smartphone,
    Banknote,
    DollarSign,
    Info,
    Plus,
    X,
    Save
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'bank_transfer' | 'e_wallet' | 'credit_card' | 'cash';
    icon?: string;
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

interface PaymentMethodEditProps {
    paymentMethod: PaymentMethod;
}

export default function PaymentMethodEdit({ paymentMethod }: PaymentMethodEditProps) {
    const [dynamicInstructions, setDynamicInstructions] = useState<string[]>(
        paymentMethod.instructions && paymentMethod.instructions.length > 0 
            ? paymentMethod.instructions 
            : ['']
    );

    const { data, setData, put, processing, errors } = useForm({
        name: paymentMethod.name || '',
        code: paymentMethod.code || '',
        type: paymentMethod.type || 'bank_transfer',
        icon: paymentMethod.icon || '',
        description: paymentMethod.description || '',
        account_number: paymentMethod.account_number || '',
        account_name: paymentMethod.account_name || '',
        bank_name: paymentMethod.bank_name || '',
        qr_code: null as File | null,
        instructions: paymentMethod.instructions || [''],
        is_active: paymentMethod.is_active ?? true,
        sort_order: paymentMethod.sort_order || 0,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payment Methods', href: '/admin/payment-methods' },
        { title: paymentMethod.name, href: `/admin/payment-methods/${paymentMethod.id}` },
        { title: 'Edit', href: '#' },
    ];

    // Update instructions when dynamicInstructions changes
    useEffect(() => {
        setData('instructions', dynamicInstructions);
    }, [dynamicInstructions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Filter out empty instructions
        const filteredInstructions = dynamicInstructions.filter(instruction => instruction.trim() !== '');
        
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (key === 'instructions') {
                filteredInstructions.forEach((instruction, index) => {
                    formData.append(`instructions[${index}]`, instruction);
                });
            } else if (key === 'qr_code' && data.qr_code) {
                formData.append(key, data.qr_code);
            } else if (key !== 'qr_code') {
                formData.append(key, String(data[key as keyof typeof data]));
            }
        });

        put(`/admin/payment-methods/${paymentMethod.id}`, {
            data: formData,
            forceFormData: true,
        });
    };

    const addInstruction = () => {
        setDynamicInstructions([...dynamicInstructions, '']);
    };

    const removeInstruction = (index: number) => {
        const newInstructions = dynamicInstructions.filter((_, i) => i !== index);
        setDynamicInstructions(newInstructions);
    };

    const updateInstruction = (index: number, value: string) => {
        const newInstructions = [...dynamicInstructions];
        newInstructions[index] = value;
        setDynamicInstructions(newInstructions);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bank_transfer': return <Building2 className="h-5 w-5" />;
            case 'e_wallet': return <Smartphone className="h-5 w-5" />;
            case 'credit_card': return <CreditCard className="h-5 w-5" />;
            case 'cash': return <Banknote className="h-5 w-5" />;
            default: return <DollarSign className="h-5 w-5" />;
        }
    };

    const getTypeFields = () => {
        switch (data.type) {
            case 'bank_transfer':
                return (
                    <>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="bank_name">Bank Name *</Label>
                                <Input
                                    id="bank_name"
                                    value={data.bank_name}
                                    onChange={(e) => setData('bank_name', e.target.value)}
                                    placeholder="e.g., Bank Central Asia"
                                    className={errors.bank_name ? 'border-red-500' : ''}
                                />
                                {errors.bank_name && <p className="text-sm text-red-500 mt-1">{errors.bank_name}</p>}
                            </div>
                            <div>
                                <Label htmlFor="account_number">Account Number *</Label>
                                <Input
                                    id="account_number"
                                    value={data.account_number}
                                    onChange={(e) => setData('account_number', e.target.value)}
                                    placeholder="1234567890"
                                    className={errors.account_number ? 'border-red-500' : ''}
                                />
                                {errors.account_number && <p className="text-sm text-red-500 mt-1">{errors.account_number}</p>}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="account_name">Account Name *</Label>
                            <Input
                                id="account_name"
                                value={data.account_name}
                                onChange={(e) => setData('account_name', e.target.value)}
                                placeholder="PropertyMS Indonesia"
                                className={errors.account_name ? 'border-red-500' : ''}
                            />
                            {errors.account_name && <p className="text-sm text-red-500 mt-1">{errors.account_name}</p>}
                        </div>
                    </>
                );

            case 'e_wallet':
                return (
                    <>
                        <div>
                            <Label htmlFor="account_number">Phone Number / Account ID *</Label>
                            <Input
                                id="account_number"
                                value={data.account_number}
                                onChange={(e) => setData('account_number', e.target.value)}
                                placeholder="081234567890"
                                className={errors.account_number ? 'border-red-500' : ''}
                            />
                            {errors.account_number && <p className="text-sm text-red-500 mt-1">{errors.account_number}</p>}
                        </div>
                        <div>
                            <Label htmlFor="account_name">Account Name</Label>
                            <Input
                                id="account_name"
                                value={data.account_name}
                                onChange={(e) => setData('account_name', e.target.value)}
                                placeholder="PropertyMS"
                                className={errors.account_name ? 'border-red-500' : ''}
                            />
                            {errors.account_name && <p className="text-sm text-red-500 mt-1">{errors.account_name}</p>}
                        </div>
                        <div>
                            <Label htmlFor="qr_code">QR Code (Optional)</Label>
                            <Input
                                id="qr_code"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setData('qr_code', e.target.files?.[0] || null)}
                                className={errors.qr_code ? 'border-red-500' : ''}
                            />
                            {errors.qr_code && <p className="text-sm text-red-500 mt-1">{errors.qr_code}</p>}
                            <p className="text-sm text-gray-500 mt-1">Upload QR code for easy payment</p>
                            {paymentMethod.qr_code && (
                                <div className="mt-2">
                                    <p className="text-sm text-gray-600">Current QR Code:</p>
                                    <img 
                                        src={`/storage/${paymentMethod.qr_code}`} 
                                        alt="Current QR Code" 
                                        className="w-32 h-32 object-cover border rounded-md mt-1"
                                    />
                                </div>
                            )}
                        </div>
                    </>
                );

            case 'cash':
                return (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Cash payment doesn't require account details. Instructions will guide customers on how to make cash payments.
                        </AlertDescription>
                    </Alert>
                );

            case 'credit_card':
                return (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Credit card payment integration will be configured separately through payment gateway settings.
                        </AlertDescription>
                    </Alert>
                );

            default:
                return null;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${paymentMethod.name} - Payment Methods`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/payment-methods">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Payment Methods
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Edit Payment Method</h1>
                            <p className="text-gray-600 mt-1">
                                Update payment method details and configuration
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Basic Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="name">Payment Method Name *</Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="e.g., Bank BCA"
                                                className={errors.name ? 'border-red-500' : ''}
                                            />
                                            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="code">Code *</Label>
                                            <Input
                                                id="code"
                                                value={data.code}
                                                onChange={(e) => setData('code', e.target.value)}
                                                placeholder="e.g., bca"
                                                className={errors.code ? 'border-red-500' : ''}
                                            />
                                            {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
                                            <p className="text-sm text-gray-500 mt-1">Unique identifier for this payment method</p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="type">Payment Type *</Label>
                                            <Select value={data.type} onValueChange={(value) => setData('type', value as any)}>
                                                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                                                    <div className="flex items-center gap-2">
                                                        {getTypeIcon(data.type)}
                                                        <SelectValue placeholder="Select payment type" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="bank_transfer">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="h-4 w-4" />
                                                            Bank Transfer
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="e_wallet">
                                                        <div className="flex items-center gap-2">
                                                            <Smartphone className="h-4 w-4" />
                                                            E-Wallet
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="credit_card">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4" />
                                                            Credit Card
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="cash">
                                                        <div className="flex items-center gap-2">
                                                            <Banknote className="h-4 w-4" />
                                                            Cash
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="icon">Icon (Emoji)</Label>
                                            <Input
                                                id="icon"
                                                value={data.icon}
                                                onChange={(e) => setData('icon', e.target.value)}
                                                placeholder="🏦"
                                                className={errors.icon ? 'border-red-500' : ''}
                                                maxLength={10}
                                            />
                                            {errors.icon && <p className="text-sm text-red-500 mt-1">{errors.icon}</p>}
                                            <p className="text-sm text-gray-500 mt-1">Optional emoji icon for display</p>
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Brief description of this payment method"
                                            className={errors.description ? 'border-red-500' : ''}
                                            rows={3}
                                        />
                                        {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Type-specific Fields */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {getTypeIcon(data.type)}
                                        Payment Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {getTypeFields()}
                                </CardContent>
                            </Card>

                            {/* Instructions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment Instructions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Add step-by-step instructions for customers on how to make payments using this method.
                                    </p>
                                    
                                    {dynamicInstructions.map((instruction, index) => (
                                        <div key={index} className="flex gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    value={instruction}
                                                    onChange={(e) => updateInstruction(index, e.target.value)}
                                                    placeholder={`Step ${index + 1}: Enter instruction...`}
                                                />
                                            </div>
                                            {dynamicInstructions.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeInstruction(index)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addInstruction}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Instruction
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Status & Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="is_active">Active Status</Label>
                                            <p className="text-sm text-gray-500">
                                                Enable this payment method for customers
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked)}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="sort_order">Sort Order</Label>
                                        <Input
                                            id="sort_order"
                                            type="number"
                                            value={data.sort_order}
                                            onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            min="0"
                                            max="999"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                            Lower numbers appear first
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <Button 
                                            type="submit" 
                                            className="w-full"
                                            disabled={processing}
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            {processing ? 'Updating...' : 'Update Payment Method'}
                                        </Button>
                                        
                                        <Link href="/admin/payment-methods" className="block">
                                            <Button variant="outline" className="w-full">
                                                Cancel
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Info */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-sm text-gray-600 space-y-2">
                                        <p><strong>Created:</strong> {new Date(paymentMethod.created_at).toLocaleDateString()}</p>
                                        <p><strong>Last Updated:</strong> {new Date(paymentMethod.updated_at).toLocaleDateString()}</p>
                                        <p><strong>ID:</strong> {paymentMethod.id}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 