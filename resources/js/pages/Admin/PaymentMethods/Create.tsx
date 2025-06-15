import React, { useState } from 'react';
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
    X
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

export default function PaymentMethodCreate() {
    const [dynamicInstructions, setDynamicInstructions] = useState<string[]>(['']);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        type: 'bank_transfer',
        icon: '',
        description: '',
        account_number: '',
        account_name: '',
        bank_name: '',
        qr_code: null as File | null,
        instructions: [''],
        is_active: true,
        sort_order: 0,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Payment Methods', href: '/admin/payment-methods' },
        { title: 'Create', href: '#' },
    ];

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

        post('/admin/payment-methods', {
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
            <Head title="Create Payment Method - Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/admin/payment-methods">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Payment Method</h1>
                        <p className="text-gray-600 mt-1">
                            Add a new payment method for customer bookings
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Payment Method Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Basic Information */}
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
                                                onChange={(e) => setData('code', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                placeholder="e.g., bca"
                                                className={errors.code ? 'border-red-500' : ''}
                                            />
                                            {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
                                            <p className="text-sm text-gray-500 mt-1">Unique identifier (lowercase, no spaces)</p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="type">Payment Type *</Label>
                                            <Select value={data.type} onValueChange={(value: any) => setData('type', value)}>
                                                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                                                    <SelectValue />
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
                                                maxLength={10}
                                                className={errors.icon ? 'border-red-500' : ''}
                                            />
                                            {errors.icon && <p className="text-sm text-red-500 mt-1">{errors.icon}</p>}
                                            <p className="text-sm text-gray-500 mt-1">Optional emoji icon</p>
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Brief description of this payment method"
                                            rows={3}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                                    </div>

                                    {/* Type-specific fields */}
                                    {getTypeFields()}

                                    {/* Instructions */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <Label>Payment Instructions</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addInstruction}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Instruction
                                            </Button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {dynamicInstructions.map((instruction, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500 min-w-[20px]">
                                                        {index + 1}.
                                                    </span>
                                                    <Input
                                                        value={instruction}
                                                        onChange={(e) => updateInstruction(index, e.target.value)}
                                                        placeholder="Enter instruction step"
                                                        className="flex-1"
                                                    />
                                                    {dynamicInstructions.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeInstruction(index)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {errors.instructions && (
                                            <p className="text-sm text-red-500 mt-1">{errors.instructions}</p>
                                        )}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="sort_order">Sort Order</Label>
                                            <Input
                                                id="sort_order"
                                                type="number"
                                                min="0"
                                                max="999"
                                                value={data.sort_order}
                                                onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                                                className={errors.sort_order ? 'border-red-500' : ''}
                                            />
                                            {errors.sort_order && <p className="text-sm text-red-500 mt-1">{errors.sort_order}</p>}
                                            <p className="text-sm text-gray-500 mt-1">Lower numbers appear first</p>
                                        </div>
                                        <div className="flex items-center space-x-2 pt-6">
                                            <Switch
                                                id="is_active"
                                                checked={data.is_active}
                                                onCheckedChange={(checked: boolean) => setData('is_active', checked)}
                                            />
                                            <Label htmlFor="is_active">Active</Label>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Preview */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Preview</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="border rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
                                                    {data.icon ? (
                                                        <span className="text-xl">{data.icon}</span>
                                                    ) : (
                                                        getTypeIcon(data.type)
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">
                                                        {data.name || 'Payment Method Name'}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">
                                                        {data.description || 'Description will appear here'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {data.account_number && (
                                                <div className="text-sm text-gray-600 mb-3">
                                                    <strong>
                                                        {data.bank_name && `${data.bank_name}: `}
                                                    </strong>
                                                    {data.account_number}
                                                    {data.account_name && ` (${data.account_name})`}
                                                </div>
                                            )}
                                            
                                            {dynamicInstructions.filter(i => i.trim()).length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium mb-2">Instructions:</p>
                                                    <ol className="text-sm text-gray-600 space-y-1">
                                                        {dynamicInstructions
                                                            .filter(instruction => instruction.trim())
                                                            .map((instruction, index) => (
                                                            <li key={index}>
                                                                {index + 1}. {instruction}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-4">
                        <Link href="/admin/payment-methods">
                            <Button variant="outline">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Payment Method'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 