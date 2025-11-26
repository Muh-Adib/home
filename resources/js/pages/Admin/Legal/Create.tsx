import React, { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TextFormatMarkdown from '@/components/text-mark-down';
import { 
  ArrowLeft,
  Save,
  FileText,
  AlertCircle,
  Info
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateProps {
  types: string[];
}

export default function LegalCreate({ types }: CreateProps) {
  const { data, setData, post, processing, errors } = useForm({
    type: '',
    content: '',
  });

  const [previewMode, setPreviewMode] = useState(false);

  const handleSubmit = () => {
    post('/admin/legal', {
      preserveScroll: true,
      onSuccess: () => {
        router.visit('/admin/legal');
      }
    });
  };

  const getTypeDescription = (type: string) => {
        const descriptions: Record<string, string> = {
        'Terms of Service': 'Mendefinisikan aturan, hak, dan kewajiban bagi pengguna dan penyedia layanan — bagaimana layanan dapat digunakan, perilaku yang diperbolehkan/dilarang, serta batasan tanggung jawab.',
        'Privacy Policy': 'Menjelaskan bagaimana Homsjogja mengumpulkan, menggunakan, menyimpan, melindungi, dan (jika berlaku) membagikan data pribadi pengguna, serta hak pengguna atas data tersebut.',
        'Cookies Policy': 'Menjelaskan jenis cookie atau teknologi penyimpanan data di browser yang digunakan situs, tujuan penggunaannya, dan bagaimana pengguna dapat memberikan atau menolak persetujuan atas penggunaan cookie (jika diterapkan).',
        'Refund Policy': 'Menguraikan syarat dan prosedur pengembalian dana atau kompensasi jika layanan atau produk dibayar tetapi dibatalkan, tidak terpenuhi, atau jika pengguna berhak mendapat refund.',
        'Payment Policy': 'Menjelaskan mekanisme pembayaran — metode pembayaran yang diterima, kapan pembayaran harus dilakukan, konfirmasi pembayaran, syarat-syarat terkait, dan konsekuensi jika pembayaran gagal atau dibatalkan.',
        'Copy Rights Policy': 'Menerangkan bahwa semua konten, teks, gambar, desain, dan materi di Homsjogja adalah milik Homsjogja, serta melarang penyalinan, penggandaan, distribusi ulang tanpa izin; melindungi hak kekayaan intelektual situs.',
        'Disclaimer': 'Pernyataan bahwa informasi di situs hanya untuk tujuan umum — Homsjogja tidak memberikan jaminan atas keakuratan, kelengkapan, atau hasil dari layanan, serta menegaskan bahwa pengguna menggunakan layanan atas risiko mereka sendiri.'
      };
      
    return descriptions[type] || '';
  };

  const getTypeIcon = (type: string) => {
    return <FileText className="h-5 w-5" />;
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Buat Dokumen Legal</h1>
              <p className="text-gray-500 mt-1">Tambahkan halaman legal baru ke situs web Anda</p>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Judul dan slug akan dibuat secara otomatis berdasarkan jenis dokumen yang Anda pilih.
            Versi akan dimulai dari V 1.0.0.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Jenis Dokumen</CardTitle>
              <CardDescription>
                Pilih jenis dokumen legal yang ingin Anda buat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Jenis *</Label>
                <Select
                  value={data.type}
                  onValueChange={(value) => setData('type', value)}
                >
                  <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Pilih jenis dokumen" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Semua jenis dokumen sudah dibuat
                      </div>
                    ) : (
                      types.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(type)}
                            <span>{type}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.type}
                  </p>
                )}
              </div>

              {/* Type Description */}
              {data.type && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {getTypeDescription(data.type)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Isi Dokumen</CardTitle>
                  <CardDescription>
                    Tulis isi dokumen legal Anda menggunakan Markdown
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? 'Edit' : 'Pratinjau'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!previewMode ? (
                <div className="space-y-2">
                  <Textarea
                    id="content"
                    placeholder={`Masukkan isi dokumen legal Anda di sini... Anda dapat menggunakan pemformatan Markdown.

Contoh:
# Judul 1
## Judul 2

**Teks tebal**
*Teks miring*

- Item daftar 1
- Item daftar 2

[Teks tautan](https://example.com)`}
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
                  <p className="text-xs text-gray-500">
                    Tip: Gunakan sintaks Markdown untuk pemformatan. Mendukung judul, tebal, miring, daftar, dan tautan.
                  </p>
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

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin/legal">
              <Button type="button" variant="outline">
                Batalkan
              </Button>
            </Link>
            <Button 
              onClick={handleSubmit}
              disabled={processing || types.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {processing ? 'Membuat...' : 'Buat Dokumen Legal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}