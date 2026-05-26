import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MessageSquare, Clock, ExternalLink } from 'lucide-react';

interface Lead {
    id: number;
    name: string;
    phone: string;
}

interface Conversation {
    id: number;
    conversation_id: string;
    channel: string;
    status: string;
    summary: string | null;
    tags: string[] | null;
    started_at: string | null;
    last_activity_at: string;
    lead: Lead | null;
}

interface PaginatedConversations {
    data: Conversation[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    conversations: PaginatedConversations;
    filters: { status?: string; channel?: string };
}

const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    escalated: 'bg-orange-100 text-orange-800',
    closed: 'bg-gray-100 text-gray-600',
    abandoned: 'bg-red-100 text-red-700',
};

const channelIcons: Record<string, string> = {
    web_chat: '🌐',
    whatsapp: '📱',
    instagram: '📸',
};

export default function Conversations({ conversations, filters }: Props) {
    const applyFilter = (key: string, value: string) => {
        router.get(
            route('admin.ai-agent.conversations'),
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AdminLayout>
            <Head title="Percakapan AI Agent" />

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
                            <MessageSquare className="h-5 w-5 text-violet-500" />
                            <h1 className="text-xl font-semibold">Percakapan AI Agent</h1>
                            <Badge variant="secondary">{conversations.total}</Badge>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Select value={filters.channel ?? 'all'} onValueChange={(v) => applyFilter('channel', v)}>
                            <SelectTrigger className="h-8 w-36 text-sm">
                                <SelectValue placeholder="Channel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Channel</SelectItem>
                                <SelectItem value="web_chat">Web Chat</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.status ?? 'all'} onValueChange={(v) => applyFilter('status', v)}>
                            <SelectTrigger className="h-8 w-36 text-sm">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="active">Aktif</SelectItem>
                                <SelectItem value="escalated">Eskalasi</SelectItem>
                                <SelectItem value="closed">Selesai</SelectItem>
                                <SelectItem value="abandoned">Ditinggal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {conversations.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">
                            Tidak ada percakapan yang cocok dengan filter.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {conversations.data.map((conv) => (
                            <div
                                key={conv.id}
                                className="flex items-center justify-between rounded-lg border bg-white p-4 hover:bg-gray-50"
                            >
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{channelIcons[conv.channel] ?? '💬'}</span>
                                        <code className="text-xs text-gray-500">{conv.conversation_id}</code>
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[conv.status] ?? 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {conv.status}
                                        </span>
                                    </div>

                                    {conv.summary && (
                                        <p className="truncate text-sm text-gray-700">{conv.summary}</p>
                                    )}

                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        {conv.lead && (
                                            <span className="font-medium text-gray-700">
                                                {conv.lead.name} · {conv.lead.phone}
                                            </span>
                                        )}
                                        {conv.tags && conv.tags.length > 0 && (
                                            <div className="flex gap-1">
                                                {conv.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="rounded bg-gray-100 px-1.5 py-0.5 text-xs"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {conv.last_activity_at}
                                        </span>
                                    </div>
                                </div>

                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={route('admin.ai-agent.conversations.show', conv.conversation_id)}>
                                        <ExternalLink className="mr-1 h-4 w-4" />
                                        Lihat
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {conversations.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {Array.from({ length: conversations.last_page }, (_, i) => i + 1).map((page) => (
                            <Button
                                key={page}
                                size="sm"
                                variant={page === conversations.current_page ? 'default' : 'outline'}
                                onClick={() =>
                                    router.get(route('admin.ai-agent.conversations'), { ...filters, page })
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
