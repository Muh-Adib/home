import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, Clock, MessageSquare, CheckCircle, User } from 'lucide-react';

interface Lead {
    id: number;
    name: string;
    phone: string;
    whatsapp_url: string;
}

interface Escalation {
    id: number;
    escalation_id: string;
    conversation_id: string | null;
    trigger: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    summary: string;
    context: Record<string, any> | null;
    recommended_action: string | null;
    channel_preference: string;
    status: string;
    claimed_by: string | null;
    claimed_at: string | null;
    resolved_at: string | null;
    created_at: string;
    created_at_human: string;
    lead: Lead | null;
}

interface PaginatedEscalations {
    data: Escalation[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    escalations: PaginatedEscalations;
    filters: { status?: string; urgency?: string };
}

const urgencyConfig: Record<string, { label: string; className: string }> = {
    critical: { label: 'KRITIS', className: 'bg-red-100 text-red-800 border-red-300' },
    high: { label: 'TINGGI', className: 'bg-orange-100 text-orange-800 border-orange-300' },
    medium: { label: 'SEDANG', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    low: { label: 'RENDAH', className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

const triggerLabels: Record<string, string> = {
    closing_intent: '🛒 Siap Booking',
    discount_request: '💰 Minta Diskon',
    complaint: '😤 Komplain',
    refund_request: '↩️ Refund',
    custom_request: '✨ Request Khusus',
    out_of_knowledge: '❓ Di Luar KB',
    explicit_request: '👤 Minta Admin',
    negative_sentiment: '😠 Sentimen Negatif',
    vip_detected: '⭐ VIP',
};

export default function Escalations({ escalations, filters }: Props) {
    // router.patch for claim/resolve — no form data needed, just trigger action
    const handleClaim = (escalation: Escalation) => {
        router.patch(route('admin.ai-agent.escalations.claim', escalation.id), {}, {
            preserveScroll: true,
            onSuccess: () => router.reload(),
        });
    };

    const handleResolve = (escalation: Escalation) => {
        if (!confirm('Tandai eskalasi ini sebagai selesai?')) return;
        router.patch(route('admin.ai-agent.escalations.resolve', escalation.id), {}, {
            preserveScroll: true,
            onSuccess: () => router.reload(),
        });
    };

    const applyFilter = (key: string, value: string) => {
        router.get(
            route('admin.ai-agent.escalations'),
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AdminLayout>
            <Head title="Eskalasi AI Agent" />

            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={route('admin.ai-agent.index')}>
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Kembali
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            <h1 className="text-xl font-semibold">Eskalasi AI Agent</h1>
                            <Badge variant="secondary">{escalations.total}</Badge>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Select
                            value={filters.urgency ?? 'all'}
                            onValueChange={(v) => applyFilter('urgency', v)}
                        >
                            <SelectTrigger className="h-8 w-36 text-sm">
                                <SelectValue placeholder="Urgensi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Urgensi</SelectItem>
                                <SelectItem value="critical">Kritis</SelectItem>
                                <SelectItem value="high">Tinggi</SelectItem>
                                <SelectItem value="medium">Sedang</SelectItem>
                                <SelectItem value="low">Rendah</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.status ?? 'pending'}
                            onValueChange={(v) => applyFilter('status', v)}
                        >
                            <SelectTrigger className="h-8 w-36 text-sm">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="created">Baru</SelectItem>
                                <SelectItem value="claimed">Di-claim</SelectItem>
                                <SelectItem value="resolved">Selesai</SelectItem>
                                <SelectItem value="abandoned">Diabaikan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {escalations.data.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle className="mb-3 h-10 w-10 text-green-400" />
                            <p className="font-medium text-gray-700">Tidak ada eskalasi pending</p>
                            <p className="text-sm text-gray-500">
                                AI Agent sedang menangani semua percakapan dengan baik.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {escalations.data.map((esc) => {
                            const urgency = urgencyConfig[esc.urgency];
                            return (
                                <Card
                                    key={esc.id}
                                    className={esc.urgency === 'critical' ? 'border-red-300 shadow-sm' : ''}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1 space-y-2">
                                                {/* Header row */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${urgency.className}`}
                                                    >
                                                        {urgency.label}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {triggerLabels[esc.trigger] ?? esc.trigger}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {esc.status}
                                                    </Badge>
                                                    {esc.claimed_by && (
                                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                                            <User className="h-3 w-3" />
                                                            {esc.claimed_by}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm text-gray-800">{esc.summary}</p>

                                                {esc.context && (
                                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                                        {esc.context.preferred_unit && (
                                                            <span>🏡 {esc.context.preferred_unit}</span>
                                                        )}
                                                        {esc.context.dates && (
                                                            <span>📅 {esc.context.dates}</span>
                                                        )}
                                                        {esc.context.total_price && (
                                                            <span>
                                                                💵 Rp{' '}
                                                                {esc.context.total_price.toLocaleString('id-ID')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {esc.lead && (
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <span className="font-medium text-gray-700">
                                                            {esc.lead.name}
                                                        </span>
                                                        <span className="text-gray-500">{esc.lead.phone}</span>
                                                        <a
                                                            href={esc.lead.whatsapp_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium text-green-600 hover:underline"
                                                        >
                                                            Buka WhatsApp →
                                                        </a>
                                                    </div>
                                                )}

                                                {esc.conversation_id && (
                                                    <Link
                                                        href={route(
                                                            'admin.ai-agent.conversations.show',
                                                            esc.conversation_id,
                                                        )}
                                                        className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
                                                    >
                                                        <MessageSquare className="h-3 w-3" />
                                                        Lihat percakapan
                                                    </Link>
                                                )}

                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <Clock className="h-3 w-3" />
                                                    {esc.created_at_human} · {esc.created_at}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {esc.status === 'created' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleClaim(esc)}
                                                    >
                                                        Claim
                                                    </Button>
                                                )}
                                                {['created', 'claimed', 'in_progress'].includes(esc.status) && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleResolve(esc)}
                                                    >
                                                        Selesai
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {escalations.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: escalations.last_page }, (_, i) => i + 1).map((page) => (
                            <Button
                                key={page}
                                size="sm"
                                variant={page === escalations.current_page ? 'default' : 'outline'}
                                onClick={() =>
                                    router.get(route('admin.ai-agent.escalations'), { ...filters, page })
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
