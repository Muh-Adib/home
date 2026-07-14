import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type BreadcrumbItem, type PageProps } from '@/types';
import {
    Calendar,
    Building2,
    Target,
    HelpCircle,
    CheckCircle,
    AlertTriangle,
    XCircle,
    ArrowUpRight,
    TrendingUp,
    Bookmark,
    Moon,
} from 'lucide-react';

interface OccupancyReportItem {
    property_id: number;
    property_name: string;
    occupied_nights: number;
    vacant_nights: number;
    occupancy_percentage: number;
    potential_max_percentage: number;
    potential_max_nights: number;
    target_status: 'Tercapai' | 'Potensial Tercapai' | 'Tidak Tercapai';
}

interface SummaryStats {
    total_units: number;
    average_occupancy: number;
    total_occupied_nights: number;
    total_vacant_nights: number;
    units_meeting_target: number;
    units_potential_target: number;
}

interface OccupancyProps {
    occupancyReport: OccupancyReportItem[];
    summary: SummaryStats;
    filters: {
        month: number;
        year: number;
    };
}

export default function OccupancyReport({ occupancyReport, summary, filters }: OccupancyProps) {
    const [month, setMonth] = useState(filters.month.toString());
    const [year, setYear] = useState(filters.year.toString());

    const months = [
        { value: '1', label: 'Januari' },
        { value: '2', label: 'Februari' },
        { value: '3', label: 'Maret' },
        { value: '4', label: 'April' },
        { value: '5', label: 'Mei' },
        { value: '6', label: 'Juni' },
        { value: '7', label: 'Juli' },
        { value: '8', label: 'Agustus' },
        { value: '9', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

    const handleFilterChange = (newMonth = month, newYear = year) => {
        router.get('/admin/reports/occupancy', {
            month: newMonth,
            year: newYear,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const getTargetBadge = (status: OccupancyReportItem['target_status']) => {
        if (status === 'Tercapai') {
            return (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold text-xs px-3 py-1 flex items-center gap-1 w-fit">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    Tercapai (≥ 25 Malam)
                </Badge>
            );
        }
        if (status === 'Potensial Tercapai') {
            return (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-bold text-xs px-3 py-1 flex items-center gap-1 w-fit">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    Potensial Tercapai
                </Badge>
            );
        }
        return (
            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none font-bold text-xs px-3 py-1 flex items-center gap-1 w-fit">
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                Tidak Tercapai
            </Badge>
        );
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Laporan', href: '/admin/reports' },
        { title: 'Laporan Okupansi' },
    ];

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Laporan Okupansi Properti" />

            <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Laporan Okupansi Properti</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Pantau persentase hunian unit, sisa malam kosong, potensi okupansi maksimal, dan pencapaian target bulanan.
                        </p>
                    </div>

                    {/* Month Year Filters */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border shadow-sm w-full md:w-auto">
                        <Calendar className="h-4 w-4 text-slate-400 ml-2 hidden sm:block" />
                        <Select
                            value={month}
                            onValueChange={(val) => {
                                setMonth(val);
                                handleFilterChange(val, year);
                            }}
                        >
                            <SelectTrigger className="w-[150px] border-none shadow-none font-bold focus:ring-0">
                                <SelectValue placeholder="Pilih Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m) => (
                                    <SelectItem key={m.value} value={m.value} className="font-medium">
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

                        <Select
                            value={year}
                            onValueChange={(val) => {
                                setYear(val);
                                handleFilterChange(month, val);
                            }}
                        >
                            <SelectTrigger className="w-[100px] border-none shadow-none font-bold focus:ring-0">
                                <SelectValue placeholder="Pilih Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y} value={y} className="font-medium">
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden relative">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-rata Okupansi</CardTitle>
                            <TrendingUp className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800">{Math.round(summary.average_occupancy)}%</div>
                            <Progress value={Math.round(summary.average_occupancy)} className="h-1.5 mt-3 bg-slate-100" />
                            <p className="text-[10px] text-slate-400 font-semibold mt-2 uppercase tracking-wide">Seluruh Properti Aktif</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Malam Terisi</CardTitle>
                            <Moon className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800">{summary.total_occupied_nights} Malam</div>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Dari total seluruh unit terpesan
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-2 uppercase tracking-wide">Akumulasi Bulan Ini</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Malam Kosong Tersisa</CardTitle>
                            <HelpCircle className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800">{summary.total_vacant_nights} Malam</div>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Malam kosong yang masih tersisa
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-2 uppercase tracking-wide">Peluang Tambahan</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pencapaian Target</CardTitle>
                            <Target className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800">
                                {summary.units_meeting_target} <span className="text-sm font-bold text-slate-400">/ {summary.total_units} Unit</span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-1">
                                {summary.units_potential_target > 0 ? (
                                    <span className="text-amber-600 font-bold">+{summary.units_potential_target} Unit berpotensi tercapai</span>
                                ) : (
                                    "Unit mencapai target ≥ 25 malam"
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-2 uppercase tracking-wide">Bagian Target</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Table Card */}
                <Card className="border-slate-200/80 shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-slate-800">Detail Okupansi per Unit</CardTitle>
                        <CardDescription>
                            Daftar persentase okupansi, sisa malam kosong, potensi okupansi maksimal, dan pencapaian target 25 malam per properti.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {occupancyReport.length > 0 ? (
                            <div className="space-y-4">
                                {/* Desktop View */}
                                <div className="hidden sm:block overflow-x-auto border border-slate-100 rounded-xl">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider bg-slate-50/50">
                                                <th className="py-2.5 px-3 font-bold">Nama Unit Properti</th>
                                                <th className="py-2.5 px-3 font-bold text-center">Malam Terisi</th>
                                                <th className="py-2.5 px-3 font-bold text-center">Sisa Malam Kosong</th>
                                                <th className="py-2.5 px-3 font-bold">Persentase Okupansi</th>
                                                <th className="py-2.5 px-3 font-bold">Potensi Max Okupansi</th>
                                                <th className="py-2.5 px-3 font-bold">Target Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {occupancyReport.map((row, index) => {
                                                const rowEven = index % 2 === 0;
                                                const occupancyPercent = Math.min(100, Math.round(row.occupancy_percentage));
                                                const potentialPercent = Math.min(100, Math.round(row.potential_max_percentage));
                                                
                                                return (
                                                    <tr
                                                        key={row.property_id}
                                                        className={`border-b border-slate-100/50 hover:bg-slate-200/10 transition-colors ${rowEven ? 'bg-transparent' : 'bg-slate-50/20'}`}
                                                    >
                                                        <td className="py-2 px-3 font-bold text-slate-800 flex items-center gap-2">
                                                            <Building2 className="h-4 w-4 text-slate-400" />
                                                            {row.property_name}
                                                        </td>
                                                        <td className="py-2 px-3 font-black text-slate-900 text-center text-xs">
                                                            {row.occupied_nights} Malam
                                                        </td>
                                                        <td className="py-2 px-3 font-bold text-rose-500 text-center text-xs">
                                                            {row.vacant_nights} Malam
                                                        </td>
                                                        <td className="py-2 px-3 w-[180px]">
                                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                                                                <span>{occupancyPercent}%</span>
                                                            </div>
                                                            <Progress value={occupancyPercent} className="h-1.5 bg-slate-100" />
                                                        </td>
                                                        <td className="py-2 px-3 w-[180px]">
                                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                                                                <span>{potentialPercent}% ({row.potential_max_nights} Malam)</span>
                                                            </div>
                                                            <Progress value={potentialPercent} className="h-1.5 bg-slate-100 [&>div]:bg-blue-500" />
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            {getTargetBadge(row.target_status)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile View */}
                                <div className="block sm:hidden space-y-4">
                                    {occupancyReport.map((row) => (
                                        <div
                                            key={row.property_id}
                                            className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-sm"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-0.5">
                                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                                        <Building2 className="h-4 w-4 text-slate-400" />
                                                        {row.property_name}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                <div>
                                                    <span className="text-slate-400 font-bold text-[10px] uppercase block">Terisi</span>
                                                    <span className="font-black text-slate-800">{row.occupied_nights} Malam</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-bold text-[10px] uppercase block">Sisa Kosong</span>
                                                    <span className="font-black text-rose-500">{row.vacant_nights} Malam</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 text-xs border-t pt-3 border-slate-100">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                        <span>Okupansi Saat Ini</span>
                                                        <span>{Math.round(row.occupancy_percentage)}%</span>
                                                    </div>
                                                    <Progress value={Math.round(row.occupancy_percentage)} className="h-1.5 bg-slate-100" />
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                        <span>Potensi Okupansi Maksimal</span>
                                                        <span>{Math.round(row.potential_max_percentage)}%</span>
                                                    </div>
                                                    <Progress value={Math.round(row.potential_max_percentage)} className="h-1.5 bg-slate-100 [&>div]:bg-blue-500" />
                                                </div>
                                            </div>

                                            <div className="border-t pt-3 border-slate-100 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Target Status</span>
                                                {getTargetBadge(row.target_status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 border border-dashed rounded-xl">
                                <Building2 className="mx-auto h-12 w-12 text-slate-300" />
                                <h3 className="mt-2 text-sm font-semibold text-slate-700">Tidak ada unit properti</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    Tidak ditemukan unit properti aktif untuk ditampilkan.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
