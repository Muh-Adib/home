import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
    Users,
    Calendar,
    DollarSign,
    TrendingUp,
    CheckCircle,
    UserCheck,
    MessageSquare,
    Calculator,
    Download,
    Percent,
    Award,
    Sparkles,
} from 'lucide-react';
import { DateRange } from '@/components/ui/date-range';

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
    assigned_damages: number;
    damage_points: number;
}

interface StaffPerformanceProps extends PageProps {
    performanceData: StaffPerformanceItem[];
    filters: {
        date_from: string;
        date_to: string;
    };
}

export default function StaffPerformance({ performanceData, filters }: StaffPerformanceProps) {
    // Breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reports', href: '/admin/reports' },
        { title: 'Staff Performance' },
    ];

    // Filter Form State
    const { data: filterData, setData: setFilterData, get: getFilter } = useForm({
        date_from: filters.date_from,
        date_to: filters.date_to,
    });

    const handleApplyFilter = (e: React.FormEvent) => {
        e.preventDefault();
        getFilter(route('admin.reports.staff-performance'));
    };

    // Bonus Calculator Config State
    const [rates, setRates] = useState({
        followUpRate: 5000,   // Rp 5.000 / follow-up
        creationRate: 5000,   // Rp 5.000 / input booking
        closingRate: 15000,   // Rp 15.000 / closing (DP received)
        checkInRate: 10000,   // Rp 10.000 / check-in
        commissionPercent: 0.5, // 0.5% of total deal value
        damagePointRate: 1000, // Rp 1.000 / point kerusakan
    });

    const handleRateChange = (key: keyof typeof rates, val: number) => {
        setRates(prev => ({ ...prev, [key]: val }));
    };

    // Calculations helper for a staff member
    const calculateStaffBonus = (item: StaffPerformanceItem) => {
        const followUpBonus = item.follow_ups * rates.followUpRate;
        const creationBonus = item.creations * rates.creationRate;
        const closingBonus = item.closings * rates.closingRate;
        const checkInBonus = item.check_ins * rates.checkInRate;
        const commissionBonus = (item.deals_value * rates.commissionPercent) / 100;
        const damageBonus = (item.damage_points || 0) * rates.damagePointRate;
        const total = followUpBonus + creationBonus + closingBonus + checkInBonus + commissionBonus + damageBonus;

        return {
            followUpBonus,
            creationBonus,
            closingBonus,
            checkInBonus,
            commissionBonus,
            damageBonus,
            total,
        };
    };

    // Totals across all staff
    const summaryTotals = performanceData.reduce((acc, curr) => {
        const bonus = calculateStaffBonus(curr);
        return {
            follow_ups: acc.follow_ups + curr.follow_ups,
            creations: acc.creations + curr.creations,
            closings: acc.closings + curr.closings,
            check_ins: acc.check_ins + curr.check_ins,
            deals_value: acc.deals_value + curr.deals_value,
            resolved_damages: acc.resolved_damages + (curr.resolved_damages || 0),
            damage_points: acc.damage_points + (curr.damage_points || 0),
            total_bonus: acc.total_bonus + bonus.total,
        };
    }, {
        follow_ups: 0,
        creations: 0,
        closings: 0,
        check_ins: 0,
        deals_value: 0,
        resolved_damages: 0,
        damage_points: 0,
        total_bonus: 0,
    });

    // CSV Export
    const handleExportCSV = () => {
        const headers = ['Nama Staf', 'Role', 'Follow-up (Chat & DP Req)', 'Input Form', 'Closing (DP Masuk)', 'Check-in (Hospitality)', 'Tindakan Kerusakan', 'Poin Kerusakan', 'Total Nilai Deal (Rp)', 'Total Bonus Kinerja (Rp)'];
        const rows = performanceData.map(item => {
            const bonus = calculateStaffBonus(item);
            return [
                item.name,
                item.role.replace('_', ' ').toUpperCase(),
                item.follow_ups,
                item.creations,
                item.closings,
                item.check_ins,
                item.resolved_damages || 0,
                item.damage_points || 0,
                item.deals_value,
                bonus.total
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `laporan_kinerja_staf_${filterData.date_from}_to_${filterData.date_to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Kinerja Staf - Laporan" />

            <div className="min-h-screen pb-20 space-y-6 md:space-y-8">
                {/* Hero Header */}
                <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 sm:py-8 rounded-b-2xl shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="h-6 w-6 text-yellow-400" />
                                Kinerja & Bonus Staf
                            </h1>
                            <p className="text-purple-200 mt-1 text-sm sm:text-base">
                                Evaluasi performa admin & frontdesk serta hitung bonus payroll kerja
                            </p>
                        </div>
                        <Button 
                            onClick={handleExportCSV} 
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 self-start md:self-center"
                        >
                            <Download className="h-4 w-4 mr-2" /> Unduh Laporan (.csv)
                        </Button>
                    </div>
                </div>

                {/* Filter Panel */}
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-800">Filter Laporan & Periode</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleApplyFilter} className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="flex-1 w-full space-y-2">
                                <Label className="text-xs text-slate-500 font-medium">Rentang Tanggal Pemesanan / Check-in</Label>
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
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="bg-slate-50 border border-slate-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Follow-Up</div>
                                <div className="text-lg font-bold text-slate-800">{summaryTotals.follow_ups}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border border-slate-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Input Booking</div>
                                <div className="text-lg font-bold text-slate-800">{summaryTotals.creations}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border border-slate-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-green-100 text-green-700">
                                <CheckCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Closing</div>
                                <div className="text-lg font-bold text-slate-800">{summaryTotals.closings}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border border-slate-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-700">
                                <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Check-In</div>
                                <div className="text-lg font-bold text-slate-800">{summaryTotals.check_ins}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border border-slate-200 col-span-2 lg:col-span-1">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Est. Bonus Payroll</div>
                                <div className="text-lg font-bold text-indigo-700">{formatCurrency(summaryTotals.total_bonus)}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 items-start">
                    {/* LEFT: Bonus Calculator Settings (1/3) */}
                    <div className="xl:col-span-1 space-y-6">
                        <Card className="border-purple-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-purple-50/50 border-b border-purple-100">
                                <CardTitle className="text-base flex items-center gap-2 text-purple-900">
                                    <Calculator className="h-5 w-5 text-purple-600" />
                                    Pengaturan Tarif Bonus
                                </CardTitle>
                                <CardDescription className="text-xs text-purple-700">
                                    Atur skema bonus pencapaian staf untuk kalkulasi payroll
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">Bonus Follow-Up Awal (Chat & DP Req)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">Rp</span>
                                        <Input
                                            type="number"
                                            value={rates.followUpRate}
                                            onChange={e => handleRateChange('followUpRate', Number(e.target.value))}
                                            className="pl-9 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">Bonus Input Data Booking (Form)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">Rp</span>
                                        <Input
                                            type="number"
                                            value={rates.creationRate}
                                            onChange={e => handleRateChange('creationRate', Number(e.target.value))}
                                            className="pl-9 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">Bonus Closing Deal (DP Masuk)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">Rp</span>
                                        <Input
                                            type="number"
                                            value={rates.closingRate}
                                            onChange={e => handleRateChange('closingRate', Number(e.target.value))}
                                            className="pl-9 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">Bonus Hospitality (Check-In)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">Rp</span>
                                        <Input
                                            type="number"
                                            value={rates.checkInRate}
                                            onChange={e => handleRateChange('checkInRate', Number(e.target.value))}
                                            className="pl-9 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">Komisi Closing Value (%)</Label>
                                    <div className="relative">
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">%</span>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={rates.commissionPercent}
                                            onChange={e => handleRateChange('commissionPercent', Number(e.target.value))}
                                            className="pr-9 h-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">Bonus per Poin Perbaikan Kerusakan</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">Rp</span>
                                        <Input
                                            type="number"
                                            value={rates.damagePointRate}
                                            onChange={e => handleRateChange('damagePointRate', Number(e.target.value))}
                                            className="pl-9 h-10"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT: Staff List & Detailed Breakdown Table (2/3) */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Grid Staff Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {performanceData.map(item => {
                                const bonus = calculateStaffBonus(item);
                                return (
                                    <Card key={item.id} className="border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                                                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{item.role.replace('_', ' ')}</span>
                                            </div>
                                            <Award className={`h-5 w-5 ${item.closings > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                                        </div>
                                        <CardContent className="p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                                <div>
                                                    <span className="text-slate-400 block text-[10px]">Follow-Up</span>
                                                    <span className="font-semibold text-slate-700">{item.follow_ups} booking</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[10px]">Input Booking</span>
                                                    <span className="font-semibold text-slate-700">{item.creations} booking</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[10px]">Closing (DP)</span>
                                                    <span className="font-semibold text-slate-700">{item.closings} deal</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[10px]">Check-In</span>
                                                    <span className="font-semibold text-slate-700">{item.check_ins} tamu</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[10px]">Perbaikan Unit</span>
                                                    <span className="font-semibold text-slate-700">{item.resolved_damages || 0} tindakan</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[10px]">Poin Perbaikan</span>
                                                    <span className="font-semibold text-emerald-600">{item.damage_points || 0} pts</span>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t flex justify-between items-center">
                                                <span className="text-xs text-slate-500">Estimasi Bonus</span>
                                                <span className="text-sm font-bold text-indigo-700">{formatCurrency(bonus.total)}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Detailed Bonus Table */}
                        <Card className="border border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                    Tabel Rincian Bonus Staf
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                            <th className="p-4">Nama Staf</th>
                                            <th className="p-4 text-right">Follow-Up</th>
                                            <th className="p-4 text-right">Input Form</th>
                                            <th className="p-4 text-right">Closing</th>
                                            <th className="p-4 text-right">Check-In</th>
                                            <th className="p-4 text-right">Poin Perbaikan</th>
                                            <th className="p-4 text-right">Komisi Deal</th>
                                            <th className="p-4 text-right font-bold text-indigo-700">Total Bonus</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-slate-700">
                                        {performanceData.map(item => {
                                            const bonus = calculateStaffBonus(item);
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-semibold text-slate-800">{item.name}</div>
                                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{item.role.replace('_', ' ')}</div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div>{formatCurrency(bonus.followUpBonus)}</div>
                                                        <span className="text-[10px] text-slate-400">({item.follow_ups}x)</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div>{formatCurrency(bonus.creationBonus)}</div>
                                                        <span className="text-[10px] text-slate-400">({item.creations}x)</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div>{formatCurrency(bonus.closingBonus)}</div>
                                                        <span className="text-[10px] text-slate-400">({item.closings}x)</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div>{formatCurrency(bonus.checkInBonus)}</div>
                                                        <span className="text-[10px] text-slate-400">({item.check_ins}x)</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div>{formatCurrency(bonus.damageBonus)}</div>
                                                        <span className="text-[10px] text-slate-400">({item.damage_points || 0} pts)</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div>{formatCurrency(bonus.commissionBonus)}</div>
                                                        <span className="text-[10px] text-slate-400">({rates.commissionPercent}%)</span>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-indigo-700">
                                                        {formatCurrency(bonus.total)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
