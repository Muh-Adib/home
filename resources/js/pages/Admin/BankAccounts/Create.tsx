import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
}

interface BankAccountsCreateProps {
    paymentMethods?: PaymentMethod[];
}

export default function BankAccountsCreate({ paymentMethods = [] }: BankAccountsCreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        payment_method_id: '',
        account_number: '',
        account_holder: '',
        label: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Rekening Bank', href: '/admin/bank-accounts' },
        { title: 'Tambah Rekening', href: '#' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/bank-accounts');
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Tambah Rekening Bank - Admin" />

            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/bank-accounts">
                        <Button size="icon" variant="outline" className="rounded-full">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tambah Rekening Bank</h1>
                        <p className="text-gray-500 text-sm">Tambahkan rekening bank baru untuk properti Anda</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="border-slate-100 shadow-sm bg-white rounded-2xl">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="text-slate-800 text-base font-semibold">
                                Informasi Rekening Bank
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-5">
                            {/* Label */}
                            <div className="space-y-1.5">
                                <Label htmlFor="label">Label Rekening *</Label>
                                <Input
                                    id="label"
                                    placeholder="Contoh: Mandiri Toscana, BCA Sunrise"
                                    value={data.label}
                                    onChange={(e) => setData('label', e.target.value)}
                                    className="border-slate-200"
                                    required
                                />
                                <p className="text-xs text-slate-400">
                                    Label untuk mengidentifikasi rekening ini di sistem admin.
                                </p>
                                {errors.label && (
                                    <p className="text-xs text-red-500">{errors.label}</p>
                                )}
                            </div>

                            {/* Bank Selection */}
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_method_id">Pilih Bank (Metode Pembayaran) *</Label>
                                <Select
                                    value={data.payment_method_id?.toString()}
                                    onValueChange={(val) => setData('payment_method_id', val)}
                                >
                                    <SelectTrigger id="payment_method_id" className="border-slate-200">
                                        <SelectValue placeholder="Pilih Bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map((pm) => (
                                            <SelectItem key={pm.id} value={pm.id.toString()}>
                                                {pm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.payment_method_id && (
                                    <p className="text-xs text-red-500">{errors.payment_method_id}</p>
                                )}
                            </div>

                            {/* Account Number */}
                            <div className="space-y-1.5">
                                <Label htmlFor="account_number">Nomor Rekening *</Label>
                                <Input
                                    id="account_number"
                                    placeholder="Masukkan nomor rekening tanpa tanda baca"
                                    value={data.account_number}
                                    onChange={(e) => setData('account_number', e.target.value)}
                                    className="border-slate-200 font-mono"
                                    required
                                />
                                {errors.account_number && (
                                    <p className="text-xs text-red-500">{errors.account_number}</p>
                                )}
                            </div>

                            {/* Account Holder */}
                            <div className="space-y-1.5">
                                <Label htmlFor="account_holder">Nama Pemilik Rekening *</Label>
                                <Input
                                    id="account_holder"
                                    placeholder="Nama lengkap sesuai buku tabungan"
                                    value={data.account_holder}
                                    onChange={(e) => setData('account_holder', e.target.value)}
                                    className="border-slate-200"
                                    required
                                />
                                {errors.account_holder && (
                                    <p className="text-xs text-red-500">{errors.account_holder}</p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-50">
                                <Link href="/admin/bank-accounts">
                                    <Button type="button" variant="outline">Batal</Button>
                                </Link>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                    disabled={processing}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? 'Menyimpan...' : 'Simpan Rekening'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AdminLayout>
    );
}
