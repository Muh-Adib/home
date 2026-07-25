import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { type BreadcrumbItem, type PageProps } from '@/types';
import {
    Users,
    MessageSquare,
    Download,
    Award,
    Sparkles,
    Wrench,
    FilePlus,
    CheckCircle2,
    Package,
    Calendar,
    Layers,
    ListCheck
} from 'lucide-react';
import { DateRange } from '@/components/ui/date-range';

interface PointsDetails {
    routine: number;
    cleaning: number;
    damage: number;
    custom: number;
    inventory: number;
    total: number;
}

interface StaffPerformanceItem {
    id: number;
    name: string;
    role: string;
    follow_ups: number;
    creations: number;
    closings: number;
    check_ins: number;
    deals_value: number;
    resolved_damages: number;
    damage_points: number;
    points_details?: PointsDetails;
}

interface StaffPerformanceProps extends PageProps {
    performanceData: StaffPerformanceItem[];
    filters: {
        date_from: string;
        date_to: string;
    };
}

export default function StaffPerformance({ performanceData, filters }: StaffPerformanceProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reports', href: '/admin/reports' },
        { title: 'Laporan Kinerja & Poin Staf' },
    ];

    const { data: filterData, setData: setFilterData, get: getFilter } = useForm({
        date_from: filters.date_from,
        date_to: filters.date_to,
    });

    const handleApplyFilter = (e: React.FormEvent) => {
        e.preventDefault();
        getFilter(route('admin.reports.staff-performance'));
    };

    const summaryTotals = performanceData.reduce((acc, curr) => {
        return {
            follow_ups: acc.follow_ups + curr.follow_ups,
            creations: acc.creations + curr.creations,
            resolved_damages: acc.resolved_damages + (curr.resolved_damages || 0),
            damage_points: acc.damage_points + (curr.damage_points || 0),
        };
    }, {
        follow_ups: 0,
        creations: 0,
        resolved_damages: 0,
        damage_points: 0,
    });

    const handleExportCSV = () => {
        const headers = ['Nama Staf', 'Role', 'Follow-up', 'Input Booking', 'Tugas Rutin', 'Bersih Kamar', 'Perbaikan Kerusakan', 'Tugas Khusus', 'Input Inventaris', 'Total Poin HK'];
        const rows = performanceData.map(item => [
            item.name,
            item.role.replace('_', ' ').toUpperCase(),
            item.follow_ups,
            item.creations,
            item.points_details?.routine || 0,
            item.points_details?.cleaning || 0,
            item.points_details?.damage || 0,
            item.points_details?.custom || 0,
            item.points_details?.inventory || 0,
            item.damage_points || 0
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `laporan_kinerja_poin_staf_${filterData.date_from}_to_${filterData.date_to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Laporan Kinerja & Poin Staf" />

            <div className="min-h-screen pb-20 space-y-6 md:space-y-8">
                {/* Hero Header */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 sm:py-8 rounded-b-2xl shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="h-6 w-6 text-yellow-400" />
                                Rekap Kinerja & Akumulasi Poin Staf
                            </h1>
                            <p className="text-indigo-200 mt-1 text-sm sm:text-base">
                                Evaluasi aktivitas FO (Follow-up & Input Data) dan Akumulasi Poin HK (5 Sumber: Tugas Rutin, Kamar, Perbaikan, Tugas Khusus & Input Inventaris).
                            </p>
                        </div>
                        <Button 
                            onClick={handleExportCSV} 
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 self-start md:self-center font-bold text-xs"
                        >
                            <Download className="h-4 w-4 mr-2" /> Unduh Laporan (.csv)
                        </Button>
                    </div>
                </div>

                {/* Filter Panel */}
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-800">Filter Periode Laporan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleApplyFilter} className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="flex-1 w-full space-y-2">
                                <Label className="text-xs text-slate-500 font-medium">Rentang Tanggal Laporan</Label>
                                <DateRange
                                    startDate={filterData.date_from}
                                    endDate={filterData.date_to}
                                    onDateChange={(s, e) => {
                                        setFilterData('date_from', s || '');
                                        setFilterData('date_to', e || '');
                                    }}
                                    adminMode={true}
                                    startLabel="Dari"
                                    endLabel="Sampai"
                                />
                            </div>
                            <Button type="submit" className="w-full sm:w-auto h-10 px-6 font-semibold">
                                Terapkan Filter
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-slate-50 border border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Follow-Up FO</div>
                                <div className="text-lg font-bold text-slate-800">{summaryTotals.follow_ups}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                                <FilePlus className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Input Booking FO</div>
                                <div className="text-lg font-bold text-slate-800">{summaryTotals.creations}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700">
                                <Wrench className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tindakan Perbaikan Unit</div>
                                <div className="text-lg font-bold text-slate-800">{summaryTotals.resolved_damages}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                                <Award className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Akumulasi Poin HK</div>
                                <div className="text-lg font-bold text-emerald-700">{summaryTotals.damage_points} pts</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Staff Activity & Points Breakdown Table */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Users className="h-5 w-5 text-indigo-600" />
                            Tabel Rekapitulasi Kinerja & Rincian 5 Sumber Poin HK
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                    <th className="p-4">Nama Staf</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4 text-center">FO Follow-Up</th>
                                    <th className="p-4 text-center">FO Input Booking</th>
                                    <th className="p-4 text-center">HK Tugas Rutin</th>
                                    <th className="p-4 text-center">HK Bersih Kamar</th>
                                    <th className="p-4 text-center">HK Perbaikan Unit</th>
                                    <th className="p-4 text-center">HK Tugas Khusus</th>
                                    <th className="p-4 text-center">HK Input Inventaris</th>
                                    <th className="p-4 text-right font-bold text-emerald-700">Total Poin HK</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700">
                                {performanceData.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                        <td className="p-4">
                                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">
                                                {item.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-semibold text-purple-700">
                                            {item.role === 'front_desk' ? `${item.follow_ups}x` : '—'}
                                        </td>
                                        <td className="p-4 text-center font-semibold text-blue-700">
                                            {item.role === 'front_desk' ? `${item.creations}x` : '—'}
                                        </td>
                                        <td className="p-4 text-center text-slate-600">
                                            {item.role === 'housekeeping' ? `${item.points_details?.routine || 0} pts` : '—'}
                                        </td>
                                        <td className="p-4 text-center text-slate-600">
                                            {item.role === 'housekeeping' ? `${item.points_details?.cleaning || 0} pts` : '—'}
                                        </td>
                                        <td className="p-4 text-center text-slate-600">
                                            {item.role === 'housekeeping' ? `${item.points_details?.damage || 0} pts` : '—'}
                                        </td>
                                        <td className="p-4 text-center text-slate-600">
                                            {item.role === 'housekeeping' ? `${item.points_details?.custom || 0} pts` : '—'}
                                        </td>
                                        <td className="p-4 text-center text-slate-600">
                                            {item.role === 'housekeeping' ? `${item.points_details?.inventory || 0} pts` : '—'}
                                        </td>
                                        <td className="p-4 text-right font-black text-sm text-emerald-700">
                                            {item.role === 'housekeeping' ? `${item.damage_points || 0} pts` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
