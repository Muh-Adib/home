import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bot, User, Wrench, Clock } from 'lucide-react';

interface Message {
    id: number;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    metadata: Record<string, any> | null;
    sent_at: string;
    sent_at_full: string;
}

interface Lead {
    id: number;
    name: string | null;
    phone: string;
    intent_type: string;
    status: string;
}

interface ConversationData {
    id: number;
    conversation_id: string;
    channel: string;
    status: string;
    summary: string | null;
    tags: string[] | null;
    started_at: string | null;
    last_activity_at: string | null;
    messages: Message[];
    lead: Lead | null;
}

interface Props {
    conversation: ConversationData;
}

const roleConfig: Record<string, { label: string; icon: React.ReactNode; align: string; bubbleClass: string }> = {
    user: {
        label: 'Tamu',
        icon: <User className="h-4 w-4" />,
        align: 'justify-end',
        bubbleClass: 'bg-blue-600 text-white rounded-br-sm',
    },
    assistant: {
        label: 'Mbak Homs',
        icon: <Bot className="h-4 w-4" />,
        align: 'justify-start',
        bubbleClass: 'bg-white border text-gray-800 rounded-bl-sm',
    },
    tool: {
        label: 'Tool',
        icon: <Wrench className="h-3 w-3" />,
        align: 'justify-start',
        bubbleClass: 'bg-gray-100 text-gray-600 font-mono text-xs rounded',
    },
    system: {
        label: 'System',
        icon: null,
        align: 'justify-center',
        bubbleClass: 'bg-yellow-50 text-yellow-700 text-xs border border-yellow-200 rounded',
    },
};

const channelLabels: Record<string, string> = {
    web_chat: '🌐 Web Chat',
    whatsapp: '📱 WhatsApp',
    instagram: '📸 Instagram',
};

const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    escalated: 'bg-orange-100 text-orange-800',
    closed: 'bg-gray-100 text-gray-600',
    abandoned: 'bg-red-100 text-red-700',
};

export default function ConversationDetail({ conversation }: Props) {
    return (
        <AdminLayout>
            <Head title={`Percakapan ${conversation.conversation_id}`} />

            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={route('admin.ai-agent.conversations')}>
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Kembali
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold">Detail Percakapan</h1>
                                <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[conversation.status] ?? 'bg-gray-100 text-gray-600'}`}
                                >
                                    {conversation.status}
                                </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                                <code>{conversation.conversation_id}</code>
                                <span>·</span>
                                <span>{channelLabels[conversation.channel] ?? conversation.channel}</span>
                                {conversation.started_at && (
                                    <>
                                        <span>·</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {conversation.started_at}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                    {/* Chat transcript */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader className="border-b pb-3">
                                <CardTitle className="text-sm font-medium text-gray-700">
                                    Transcript ({conversation.messages.length} pesan)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="max-h-[600px] overflow-y-auto p-4">
                                {conversation.messages.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400">Belum ada pesan.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {conversation.messages.map((msg) => {
                                            const config = roleConfig[msg.role] ?? roleConfig.system;
                                            return (
                                                <div key={msg.id} className={`flex ${config.align}`}>
                                                    <div className="max-w-[80%]">
                                                        {/* Role label */}
                                                        <div
                                                            className={`mb-1 flex items-center gap-1 text-xs text-gray-400 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            {config.icon}
                                                            <span>{config.label}</span>
                                                            <span>·</span>
                                                            <span>{msg.sent_at}</span>
                                                        </div>

                                                        {/* Bubble */}
                                                        <div
                                                            className={`rounded-2xl px-4 py-2.5 shadow-sm ${config.bubbleClass}`}
                                                        >
                                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                                                {msg.content}
                                                            </p>
                                                        </div>

                                                        {/* Metadata (tools called, latency) */}
                                                        {msg.metadata && msg.role === 'assistant' && (
                                                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                                                                {msg.metadata.tools_called && msg.metadata.tools_called.length > 0 && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Wrench className="h-3 w-3" />
                                                                        {msg.metadata.tools_called.join(', ')}
                                                                    </span>
                                                                )}
                                                                {msg.metadata.latency_ms && (
                                                                    <span>{msg.metadata.latency_ms}ms</span>
                                                                )}
                                                                {msg.metadata.tokens && (
                                                                    <span>
                                                                        {msg.metadata.tokens.input ?? 0}↑ {msg.metadata.tokens.output ?? 0}↓ tokens
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar: lead info + summary */}
                    <div className="space-y-4">
                        {/* Lead info */}
                        {conversation.lead ? (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Data Lead</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-xs text-gray-500">Nama</span>
                                        <p className="font-medium">{conversation.lead.name ?? 'Anonim'}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500">Nomor WA</span>
                                        <p>
                                            <a
                                                href={`https://wa.me/${conversation.lead.phone.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-green-600 hover:underline"
                                            >
                                                {conversation.lead.phone}
                                            </a>
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500">Intent</span>
                                        <p>{conversation.lead.intent_type.replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500">Status Lead</span>
                                        <p>
                                            <Badge variant="outline" className="text-xs">
                                                {conversation.lead.status}
                                            </Badge>
                                        </p>
                                    </div>
                                    <Button size="sm" className="w-full" asChild>
                                        <Link href={route('admin.ai-agent.leads') + `?search=${conversation.lead.phone}`}>
                                            Lihat Lead
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="py-4 text-center text-sm text-gray-400">
                                    Belum ada lead terhubung
                                </CardContent>
                            </Card>
                        )}

                        {/* Summary */}
                        {conversation.summary && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Ringkasan</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-700">{conversation.summary}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Tags */}
                        {conversation.tags && conversation.tags.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Tags</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1.5">
                                        {conversation.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Timestamps */}
                        <Card>
                            <CardContent className="space-y-2 py-3 text-xs text-gray-500">
                                {conversation.started_at && (
                                    <div className="flex justify-between">
                                        <span>Mulai</span>
                                        <span>{conversation.started_at}</span>
                                    </div>
                                )}
                                {conversation.last_activity_at && (
                                    <div className="flex justify-between">
                                        <span>Aktivitas terakhir</span>
                                        <span>{conversation.last_activity_at}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Total pesan</span>
                                    <span>{conversation.messages.length}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
