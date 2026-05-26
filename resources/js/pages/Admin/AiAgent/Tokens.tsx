import { useState } from 'react';
import { Head, Link, router, useHttp } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Key, Plus, Copy, ToggleLeft, ToggleRight, Trash2, ArrowLeft } from 'lucide-react';

interface Token {
    id: number;
    name: string;
    client_name: string | null;
    token_preview: string;
    scopes: string[] | null;
    is_active: boolean;
    last_used_at: string | null;
    expires_at: string | null;
    created_by: string | null;
    created_at: string;
}

interface Props {
    tokens: Token[];
}

export default function Tokens({ tokens }: Props) {
    const [isCreating, setIsCreating] = useState(false);
    const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // useHttp for create token (POST → JSON response, not Inertia page visit)
    const createHttp = useHttp({ name: '', client_name: '', expires_in_days: '' });

    const handleCreate = () => {
        createHttp.post(route('admin.ai-agent.tokens.store'), {
            onSuccess: (_response, httpResponse) => {
                try {
                    const body = JSON.parse(httpResponse.data);
                    setNewTokenValue(body.token ?? null);
                } catch {
                    setNewTokenValue(null);
                }
                router.reload({ only: ['tokens'] });
            },
            onError: (errors) => {
                alert(Object.values(errors).join('\n') || 'Gagal membuat token');
            },
        });
    };

    const handleCopy = () => {
        if (newTokenValue) {
            navigator.clipboard.writeText(newTokenValue);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleToggle = (token: Token) => {
        router.patch(route('admin.ai-agent.tokens.toggle', token.id), {}, {
            preserveScroll: true,
            onSuccess: () => router.reload({ only: ['tokens'] }),
        });
    };

    const handleDelete = (token: Token) => {
        if (!confirm(`Hapus token "${token.name}"? Ini tidak bisa dibatalkan.`)) return;
        router.delete(route('admin.ai-agent.tokens.destroy', token.id), {
            preserveScroll: true,
            onSuccess: () => router.reload({ only: ['tokens'] }),
        });
    };

    return (
        <AdminLayout>
            <Head title="API Tokens — AI Agent" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={route('admin.ai-agent.index')}>
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Kembali
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-gray-600" />
                            <h1 className="text-xl font-semibold">API Tokens</h1>
                        </div>
                    </div>

                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-1.5 h-4 w-4" />
                                Buat Token Baru
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Buat API Token Baru</DialogTitle>
                            </DialogHeader>

                            {newTokenValue ? (
                                <div className="space-y-4">
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                                        <p className="mb-2 text-sm font-medium text-green-800">
                                            ✅ Token berhasil dibuat. Simpan sekarang — tidak akan ditampilkan lagi.
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 rounded border bg-white px-3 py-2 font-mono text-xs text-gray-800">
                                                {newTokenValue}
                                            </code>
                                            <Button size="sm" variant="outline" onClick={handleCopy}>
                                                {copied ? '✓' : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Gunakan di header:{' '}
                                        <code className="rounded bg-gray-100 px-1">
                                            Authorization: Bearer {newTokenValue.slice(0, 20)}...
                                        </code>
                                    </p>
                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            setNewTokenValue(null);
                                            setIsCreating(false);
                                            createHttp.reset();
                                        }}
                                    >
                                        Selesai
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Nama Token *</Label>
                                        <Input
                                            id="name"
                                            placeholder="Mbak Homs AI Agent"
                                            value={createHttp.data.name}
                                            onChange={(e) => createHttp.setData('name', e.target.value)}
                                        />
                                        {createHttp.errors.name && (
                                            <p className="mt-1 text-xs text-red-500">{createHttp.errors.name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label htmlFor="client_name">Nama Client</Label>
                                        <Input
                                            id="client_name"
                                            placeholder="WhatsApp Bot Service"
                                            value={createHttp.data.client_name}
                                            onChange={(e) => createHttp.setData('client_name', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="expires">
                                            Kadaluarsa (hari, kosongkan = tidak pernah)
                                        </Label>
                                        <Input
                                            id="expires"
                                            type="number"
                                            placeholder="365"
                                            value={createHttp.data.expires_in_days}
                                            onChange={(e) =>
                                                createHttp.setData('expires_in_days', e.target.value)
                                            }
                                        />
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleCreate}
                                        disabled={!createHttp.data.name || createHttp.processing}
                                    >
                                        {createHttp.processing ? 'Membuat...' : 'Buat Token'}
                                    </Button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Token Aktif</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tokens.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Belum ada token. Buat token untuk AI Agent.
                            </p>
                        ) : (
                            <div className="divide-y">
                                {tokens.map((token) => (
                                    <div key={token.id} className="flex items-center justify-between py-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{token.name}</span>
                                                <Badge variant={token.is_active ? 'default' : 'secondary'}>
                                                    {token.is_active ? 'Aktif' : 'Nonaktif'}
                                                </Badge>
                                            </div>
                                            {token.client_name && (
                                                <p className="text-sm text-gray-500">{token.client_name}</p>
                                            )}
                                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                                                <code className="rounded bg-gray-100 px-1.5 py-0.5">
                                                    {token.token_preview}
                                                </code>
                                                {token.last_used_at && (
                                                    <span>Terakhir: {token.last_used_at}</span>
                                                )}
                                                {token.expires_at && (
                                                    <span>Kadaluarsa: {token.expires_at}</span>
                                                )}
                                                <span>Dibuat: {token.created_at}</span>
                                            </div>
                                        </div>
                                        <div className="ml-4 flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggle(token)}
                                                title={token.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            >
                                                {token.is_active ? (
                                                    <ToggleRight className="h-5 w-5 text-green-600" />
                                                ) : (
                                                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(token)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Usage guide */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Cara Penggunaan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-gray-600">
                        <p>Sertakan token di setiap request ke API v1:</p>
                        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
{`# Header yang diperlukan
Authorization: Bearer hjg_prod_xxxxx...
Content-Type: application/json

# Contoh: cek availability
POST https://homsjogja.com/api/v1/availability/check
{
  "unit_slug": "villahoms",
  "check_in": "2026-06-10",
  "check_out": "2026-06-13",
  "guests": 6
}

# Contoh: kalkulasi harga
POST https://homsjogja.com/api/v1/quotes/calculate
{
  "unit_slug": "cubic-villa",
  "check_in": "2026-06-10",
  "check_out": "2026-06-13",
  "guests": 8
}`}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
