import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Bot,
    Users,
    AlertTriangle,
    MessageSquare,
    Key,
    TrendingUp,
    Clock,
    CheckCircle,
    ExternalLink,
} from 'lucide-react';

interface Escalation {
    id: number;
    escalation_id: string;
    trigger: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    summary: string;
    status: string;
    lead_name: string | null;
    lead_phone: string | null;
    created_at: string;
    created_at_iso: string;
}

interface Lead {
    id: number;
    name: string;
    phone: string;
    intent_type: string;
    urgency: string;
    status: string;
    captured_at: string;
}

interface Stats {
    total_leads: number;
    new_leads: number;
    converted_leads: number;
    active_conversations: number;
    pending_escalations: number;
    critical_escalations: number;
    active_tokens: number;
}

interface Props {
    stats: Stats;
    recentEscalations: Escalation[];
    recentLeads: Lead[];
}

const urgencyColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const triggerLabels: Record<string, string> = {
    closing_intent: 'Siap Booking',
    discount_request: 'Minta Diskon',
    complaint: 'Komplain',
    refund_request: 'Refund',
    custom_request: 'Request Khusus',
    out_of_knowledge: 'Di Luar KB',
    explicit_request: 'Minta Admin',
    negative_sentiment: 'Sentimen Negatif',
    vip_detected: 'VIP',
};

export default function AiAgentIndex({ stats, recentEscalations, recentLeads }: Props) {
    return (
        <AdminLayout>
            <Head title="AI Agent — Mbak Homs" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                            <Bot className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">AI Agent — Mbak Homs</h1>
                            <p className="text-sm text-gray-500">Monitor leads, eskalasi, dan percakapan dari AI chatbot</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('admin.ai-agent.tokens')}>
                                <Key className="mr-1.5 h-4 w-4" />
                                API Tokens
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <StatCard
                        icon={<Users className="h-5 w-5 text-blue-600" />}
                        label="Total Leads"
                        value={stats.total_leads}
                        sub={`${stats.new_leads} baru`}
                        color="blue"
                        href={route('admin.ai-agent.leads')}
                    />
                    <StatCard
                        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                        label="Leads Konversi"
                        value={stats.converted_leads}
                        sub="booking terkonfirmasi"
                        color="green"
                        href={route('admin.ai-agent.leads') + '?status=converted'}
                    />
                    <StatCard
                        icon={<MessageSquare className="h-5 w-5 text-violet-600" />}
                        label="Percakapan Aktif"
                        value={stats.active_conversations}
                        sub="sedang berlangsung"
                        color="violet"
                        href={route('admin.ai-agent.conversations')}
                    />
                    <StatCard
                        icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
                        label="Eskalasi Pending"
                        value={stats.pending_escalations}
                        sub={stats.critical_escalations > 0 ? `${stats.critical_escalations} kritis` : 'semua normal'}
                        color={stats.critical_escalations > 0 ? 'red' : 'orange'}
                        href={route('admin.ai-agent.escalations')}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Pending Escalations */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base font-medium">Eskalasi Menunggu</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={route('admin.ai-agent.escalations')}>
                                    Lihat semua
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {recentEscalations.length === 0 ? (
                                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                                    <CheckCircle className="h-4 w-4" />
                                    Tidak ada eskalasi pending
                                </div>
                            ) : (
                                recentEscalations.map((esc) => (
                                    <div
                                        key={esc.id}
                                        className="flex items-start justify-between rounded-lg border p-3 hover:bg-gray-50"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyColors[esc.urgency]}`}
                                                >
                                                    {esc.urgency.toUpperCase()}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {triggerLabels[esc.trigger] ?? esc.trigger}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-sm text-gray-700">{esc.summary}</p>
                                            {esc.lead_name && (
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    {esc.lead_name} · {esc.lead_phone}
                                                </p>
                                            )}
                                        </div>
                                        <div className="ml-3 flex flex-col items-end gap-1">
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <Clock className="h-3 w-3" />
                                                {esc.created_at}
                                            </span>
                                            {esc.lead_phone && (
                                                <a
                                                    href={`https://wa.me/${esc.lead_phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-medium text-green-600 hover:underline"
                                                >
                                                    WhatsApp
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Leads */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base font-medium">Lead Terbaru</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={route('admin.ai-agent.leads')}>
                                    Lihat semua
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {recentLeads.length === 0 ? (
                                <p className="text-sm text-gray-500">Belum ada lead dari AI Agent.</p>
                            ) : (
                                recentLeads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{lead.name}</p>
                                            <p className="text-xs text-gray-500">{lead.phone}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant="outline" className="text-xs">
                                                {lead.intent_type.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-xs text-gray-400">{lead.captured_at}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

function StatCard({
    icon,
    label,
    value,
    sub,
    color,
    href,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    sub: string;
    color: string;
    href: string;
}) {
    const bgColors: Record<string, string> = {
        blue: 'bg-blue-50',
        green: 'bg-green-50',
        violet: 'bg-violet-50',
        orange: 'bg-orange-50',
        red: 'bg-red-50',
    };

    return (
        <Link href={href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                    <div className={`mb-3 inline-flex rounded-lg p-2 ${bgColors[color] ?? 'bg-gray-50'}`}>
                        {icon}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
                </CardContent>
            </Card>
        </Link>
    );
}
