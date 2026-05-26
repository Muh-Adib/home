import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Search, MessageSquare } from 'lucide-react';

interface Lead {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    intent_type: string;
    intent_summary: string | null;
    units_inquired: string[] | null;
    preferred_check_in: string | null;
    preferred_check_out: string | null;
    guests: number | null;
    urgency: string;
    persona_tag: string;
    channel: string;
    status: string;
    tags: string[] | null;
    captured_at: string;
    captured_at_human: string;
    whatsapp_url: string;
}

interface PaginatedLeads {
    data: Lead[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    leads: PaginatedLeads;
    filters: { status?: string; urgency?: string; intent?: string; search?: string };
}

const intentLabels: Record<string, { label: string; color: string }> = {
    booking_ready: { label: 'Siap Booking', color: 'bg-green-100 text-green-800' },
    researching: { label: 'Riset', color: 'bg-blue-100 text-blue-800' },
    pricing_check: { label: 'Cek Harga', color: 'bg-yellow-100 text-yellow-800' },
    faq_only: { label: 'FAQ', color: 'bg-gray-100 text-gray-700' },
};

const urgencyColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    this_week: 'bg-orange-100 text-orange-700',
    this_month: 'bg-yellow-100 text-yellow-700',
    flexible: 'bg-gray-100 text-gray-600',
};

export default function Leads({ leads, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    // router.patch for status update — simple data, no form state needed
    const handleStatusChange = (lead: Lead, status: string) => {
        router.patch(route('admin.ai-agent.leads.status', lead.id), { status }, {
            preserveScroll: true,
            onSuccess: () => router.reload({ only: ['leads'] }),
        });
    };

    const applyFilter = (key: string, value: string) => {
        router.get(
            route('admin.ai-agent.leads'),
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true },
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter('search', search);
    };

    return (
        <AdminLayout>
            <Head title="Leads AI Agent" />

            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={route('admin.ai-agent.index')}>
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Kembali
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <h1 className="text-xl font-semibold">Leads AI Agent</h1>
                            <Badge variant="secondary">{leads.total}</Badge>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                            <Input
                                className="h-8 w-56 pl-8 text-sm"
                                placeholder="Cari nama / nomor..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit" size="sm" variant="outline">
                            Cari
                        </Button>
                    </form>

                    <Select value={filters.status ?? 'all'} onValueChange={(v) => applyFilter('status', v)}>
                        <SelectTrigger className="h-8 w-36 text-sm">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Status</SelectItem>
                            <SelectItem value="new">Baru</SelectItem>
                            <SelectItem value="contacted">Dihubungi</SelectItem>
                            <SelectItem value="converted">Konversi</SelectItem>
                            <SelectItem value="lost">Hilang</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.urgency ?? 'all'} onValueChange={(v) => applyFilter('urgency', v)}>
                        <SelectTrigger className="h-8 w-36 text-sm">
                            <SelectValue placeholder="Urgensi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Urgensi</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="this_week">Minggu Ini</SelectItem>
                            <SelectItem value="this_month">Bulan Ini</SelectItem>
                            <SelectItem value="flexible">Fleksibel</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.intent ?? 'all'} onValueChange={(v) => applyFilter('intent', v)}>
                        <SelectTrigger className="h-8 w-40 text-sm">
                            <SelectValue placeholder="Intent" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Intent</SelectItem>
                            <SelectItem value="booking_ready">Siap Booking</SelectItem>
                            <SelectItem value="researching">Riset</SelectItem>
                            <SelectItem value="pricing_check">Cek Harga</SelectItem>
                            <SelectItem value="faq_only">FAQ</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {leads.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">
                            Tidak ada lead yang cocok dengan filter.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="overflow-hidden rounded-lg border bg-white">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-gray-50 text-xs font-medium uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Tamu</th>
                                    <th className="px-4 py-3 text-left">Intent</th>
                                    <th className="px-4 py-3 text-left">Unit Ditanyakan</th>
                                    <th className="px-4 py-3 text-left">Tanggal</th>
                                    <th className="px-4 py-3 text-left">Urgensi</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Waktu</th>
                                    <th className="px-4 py-3 text-left">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {leads.data.map((lead) => {
                                    const intent = intentLabels[lead.intent_type];
                                    return (
                                        <tr key={lead.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{lead.name}</div>
                                                <div className="text-xs text-gray-500">{lead.phone}</div>
                                                {lead.email && (
                                                    <div className="text-xs text-gray-400">{lead.email}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${intent?.color ?? 'bg-gray-100 text-gray-700'}`}
                                                >
                                                    {intent?.label ?? lead.intent_type}
                                                </span>
                                                {lead.intent_summary && (
                                                    <p className="mt-1 max-w-[200px] truncate text-xs text-gray-500">
                                                        {lead.intent_summary}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {lead.units_inquired && lead.units_inquired.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {lead.units_inquired.map((u) => (
                                                            <span
                                                                key={u}
                                                                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                                                            >
                                                                {u}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {lead.preferred_check_in ? (
                                                    <>
                                                        <div>{lead.preferred_check_in}</div>
                                                        <div className="text-gray-400">
                                                            s/d {lead.preferred_check_out}
                                                        </div>
                                                        {lead.guests && (
                                                            <div className="text-gray-400">{lead.guests} tamu</div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${urgencyColors[lead.urgency] ?? 'bg-gray-100 text-gray-600'}`}
                                                >
                                                    {lead.urgency.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Select
                                                    value={lead.status}
                                                    onValueChange={(v) => handleStatusChange(lead, v)}
                                                >
                                                    <SelectTrigger className="h-7 w-32 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="new">Baru</SelectItem>
                                                        <SelectItem value="contacted">Dihubungi</SelectItem>
                                                        <SelectItem value="converted">Konversi</SelectItem>
                                                        <SelectItem value="lost">Hilang</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                <div>{lead.captured_at_human}</div>
                                                <div className="text-gray-400">{lead.captured_at}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <a
                                                    href={lead.whatsapp_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                                                >
                                                    <MessageSquare className="h-3 w-3" />
                                                    WA
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {leads.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: leads.last_page }, (_, i) => i + 1).map((page) => (
                            <Button
                                key={page}
                                size="sm"
                                variant={page === leads.current_page ? 'default' : 'outline'}
                                onClick={() =>
                                    router.get(route('admin.ai-agent.leads'), { ...filters, page })
                                }
                            >
                                {page}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
