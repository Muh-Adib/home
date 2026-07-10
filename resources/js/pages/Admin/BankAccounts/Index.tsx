import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Building2,
    Plus,
    Search,
    Edit,
    Trash2,
    CheckCircle,
    Building
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface BankAccount {
    id: number;
    bank_name: string;
    account_number: string;
    account_holder: string;
    label: string;
    created_at: string;
    updated_at: string;
}

interface BankAccountsIndexProps {
    bankAccounts: {
        data: BankAccount[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        prev_page_url?: string;
        next_page_url?: string;
    };
    stats: {
        total: number;
    };
    filters: {
        search?: string;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function BankAccountsIndex({ bankAccounts, stats, filters, flash }: BankAccountsIndexProps) {
    const [search, setSearch] = useState(filters?.search || '');
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { processing, delete: deleteAccount } = useForm();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Rekening Bank', href: '#' },
    ];

    const handleSearch = () => {
        const params: any = {};
        if (search) params.search = search;

        router.get('/admin/bank-accounts', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setSearch('');
        router.get('/admin/bank-accounts');
    };

    const handleDelete = () => {
        if (selectedAccount) {
            deleteAccount(`/admin/bank-accounts/${selectedAccount.id}`, {
                onSuccess: () => {
                    setShowDeleteDialog(false);
                    setSelectedAccount(null);
                }
            });
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Rekening Bank Properti - Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Rekening Bank Properti</h1>
                        <p className="text-gray-600 mt-1">
                            Kelola rekening bank fisik yang didedikasikan untuk properti (auto-reconciliation)
                        </p>
                    </div>
                    <Link href="/admin/bank-accounts/create">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Rekening
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-slate-100 shadow-xs bg-white rounded-2xl">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Rekening Bank</p>
                                    <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats?.total}</p>
                                </div>
                                <Building className="h-10 w-10 text-blue-600 bg-blue-50 p-2 rounded-xl" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-100 shadow-xs bg-white rounded-2xl">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Integrasi Mutasi</p>
                                    <p className="text-sm font-semibold text-green-600 mt-2 flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full w-max">
                                        <CheckCircle className="h-4 w-4" /> Terhubung dengan Moota
                                    </p>
                                </div>
                                <Building2 className="h-10 w-10 text-green-600 bg-green-50 p-2 rounded-xl" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Filter */}
                <Card className="border-slate-100 shadow-xs bg-white rounded-2xl">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Cari nama bank, nomor rekening, pemilik..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSearch} className="bg-slate-800 hover:bg-slate-900 text-white font-medium">Cari</Button>
                                {search && (
                                    <Button variant="outline" onClick={clearFilters}>Reset</Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-semibold">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-semibold">
                        {flash.error}
                    </div>
                )}

                {/* Bank Accounts Table */}
                <Card className="border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    <th className="p-4 pl-6">Label / Identitas</th>
                                    <th className="p-4">Bank</th>
                                    <th className="p-4">Nomor Rekening</th>
                                    <th className="p-4">Nama Pemilik</th>
                                    <th className="p-4 pr-6 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                {bankAccounts.data.length > 0 ? (
                                    bankAccounts.data.map((acc) => (
                                        <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 pl-6 font-bold text-slate-900">{acc.label}</td>
                                            <td className="p-4">{acc.bank_name}</td>
                                            <td className="p-4 font-mono font-semibold">{acc.account_number}</td>
                                            <td className="p-4">{acc.account_holder}</td>
                                            <td className="p-4 pr-6 text-right space-x-2">
                                                <Link href={`/admin/bank-accounts/${acc.id}/edit`}>
                                                    <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                                                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
                                                    onClick={() => {
                                                        setSelectedAccount(acc);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            Tidak ada rekening bank ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {bankAccounts.last_page > 1 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <span className="text-xs text-slate-500">
                                Halaman {bankAccounts.current_page} dari {bankAccounts.last_page} ({bankAccounts.total} total)
                            </span>
                            <div className="flex gap-1">
                                {bankAccounts.prev_page_url && (
                                    <Link href={bankAccounts.prev_page_url}>
                                        <Button size="sm" variant="outline">Sebelumnya</Button>
                                    </Link>
                                )}
                                {bankAccounts.next_page_url && (
                                    <Link href={bankAccounts.next_page_url}>
                                        <Button size="sm" variant="outline">Selanjutnya</Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Hapus Rekening</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <p className="text-sm text-slate-600">
                            Apakah Anda yakin ingin menghapus rekening bank <strong>{selectedAccount?.label}</strong> ({selectedAccount?.bank_name} - {selectedAccount?.account_number})?
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                onClick={handleDelete}
                                disabled={processing}
                            >
                                {processing ? 'Menghapus...' : 'Ya, Hapus'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
