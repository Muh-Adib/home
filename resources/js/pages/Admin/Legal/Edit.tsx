import React, { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TextFormatMarkdown from '@/components/text-mark-down';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Save,
    AlertCircle,
    Info,
    History,
    Eye,
    Calendar,
    FileText
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LegalPage {
    id: number;
    title: string;
    slug: string;
    type: string;
    version: string;
    content: string;
    published_at: string;
}

interface EditProps {
    legalPage: LegalPage;
}

export default function LegalEdit({ legalPage }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        content: legalPage.content,
    });

    const [previewMode, setPreviewMode] = useState(false);

    const handleSubmit = () => {
        put(`/admin/legal/${legalPage.slug}`, {
            preserveScroll: true,
            onSuccess: () => {
                router.visit('/admin/legal');
            }
        });
    };

    const formatDate = (dateString: string) => {
        // Mengubah format tanggal ke Bahasa Indonesia (id-ID)
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'tos':             'bg-blue-100 text-blue-800 border-blue-200',     // Terms of Service
            'privacy':         'bg-purple-100 text-purple-800 border-purple-200', // Privacy Policy
            'cookies':         'bg-orange-100 text-orange-800 border-orange-200',   // Cookies Policy
            'refund-policy':   'bg-green-100 text-green-800 border-green-200',      // Refund Policy
            'payment-policy':  'bg-teal-100 text-teal-800 border-teal-200',         // Payment Policy
            'copyright-policy':'bg-gray-100 text-gray-800 border-gray-200',         // Copy Rights / Copyright Policy
            'disclaimer':      'bg-red-100 text-red-800 border-red-200',            // Disclaimer
          };
          
        return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const hasChanges = data.content !== legalPage.content;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/legal">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Kembali
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Edit Dokumen Legal</h1>
                            <p className="text-gray-500 mt-1">{legalPage.title}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/${legalPage.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Lihat Publik
                            </Button>
                        </Link>
                        <Link href={`/admin/legal/${legalPage.slug}/history`}
                        target="_blank"
                        rel="noopener noreferrer"
                        >
                            <Button variant="outline" size="sm">
                                <History className="h-4 w-4 mr-2" />
                                Riwayat
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Document Info */}
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-600" />
                                    <span className="font-semibold text-gray-900">{legalPage.title}</span>
                                    <Badge className={`${getTypeColor(legalPage.type)} border`}>
                                        {legalPage.type.toUpperCase()}
                                    </Badge>
                                    <Badge variant="outline" className="font-mono">
                                        {legalPage.version}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="h-4 w-4" />
                                    Terakhir diperbarui: {formatDate(legalPage.published_at)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium">URL:</span>{' '}
                                    <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                        homsjogja.com/{legalPage.slug}
                                    </code>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info Alert */}
                <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                        Saat Anda menyimpan perubahan, versi saat ini akan diarsipkan dan versi baru akan dibuat secara otomatis.
                        {hasChanges && ' Anda memiliki perubahan yang belum disimpan.'}
                    </AlertDescription>
                </Alert>

                <div className="space-y-6">
                    {/* Content Editor */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Isi Dokumen</CardTitle>
                                    <CardDescription>
                                        Edit isi dokumen legal Anda menggunakan Markdown
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasChanges && (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                            Perubahan Belum Disimpan
                                        </Badge>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPreviewMode(!previewMode)}
                                    >
                                        {previewMode ? 'Edit' : 'Pratinjau'}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!previewMode ? (
                                <div className="space-y-2">
                                    <Textarea
                                        id="content"
                                        placeholder="Masukkan isi dokumen legal Anda di sini..."
                                        value={data.content}
                                        onChange={(e) => setData('content', e.target.value)}
                                        className={`min-h-[500px] font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
                                    />
                                    {errors.content && (
                                        <p className="text-sm text-red-600 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" />
                                            {errors.content}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500">
                                            Tip: Gunakan sintaks Markdown untuk pemformatan. Mendukung judul, tebal, miring, daftar, dan tautan.
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {data.content.length} karakter
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="min-h-[500px] p-6 bg-gray-50 rounded-lg border">
                                    <div className="prose prose-sm max-w-none">
                                        {data.content ? (
                                            <TextFormatMarkdown text={data.content} />
                                        ) : (
                                            <p className="text-gray-400 italic">Tidak ada konten untuk pratinjau</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Markdown Guide */}
                    <Card className="border-gray-200 bg-gray-50">
                        <CardHeader>
                            <CardTitle className="text-base">Referensi Cepat Markdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-semibold mb-2">Judul (Headings):</p>
                                    <code className="block bg-white p-2 rounded mb-1"># Judul 1</code>
                                    <code className="block bg-white p-2 rounded mb-1">## Judul 2</code>
                                    <code className="block bg-white p-2 rounded">### Judul 3</code>
                                </div>
                                <div>
                                    <p className="font-semibold mb-2">Pemformatan Teks:</p>
                                    <code className="block bg-white p-2 rounded mb-1">**Teks tebal**</code>
                                    <code className="block bg-white p-2 rounded mb-1">*Teks miring*</code>
                                    <code className="block bg-white p-2 rounded">[Tautan](url)</code>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Version Info */}
                    <Alert>
                        <History className="h-4 w-4" />
                        <AlertDescription>
                            <p className="font-semibold mb-1">Versi Saat Ini: {legalPage.version}</p>
                            <p className="text-sm">
                                Setelah disimpan, ini akan diarsipkan dan versi baru akan dibuat.
                                Anda selalu dapat memulihkan versi sebelumnya dari{' '}
                                <Link
                                    href={`/admin/legal/${legalPage.slug}/history`}
                                    className="text-blue-600 hover:underline"
                                >
                                    halaman riwayat
                                </Link>.
                            </p>
                        </AlertDescription>
                    </Alert>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-4">
                        <Link href="/admin/legal">
                            <Button type="button" variant="outline">
                                Batalkan
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            {hasChanges && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setData('content', legalPage.content)}
                                >
                                    Atur Ulang Perubahan
                                </Button>
                            )}
                            <Button
                                onClick={handleSubmit}
                                disabled={processing || !hasChanges}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}