import React from 'react';
import { Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  RotateCcw,
  Calendar,
  Trash2,
  Clock,
  Archive
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface LegalPage {
  id: number;
  title: string;
  slug: string;
  type: string;
  version: string;
  content: string;
  published_at: string;
  deleted_at: string;
}

interface ViewArchivedProps {
  legalPage: LegalPage;
}

export default function ViewArchived({ legalPage }: ViewArchivedProps) {
  const originalSlug = legalPage.slug.split('-')[0];

  const handleRestore = () => {
    if (confirm(`Pulihkan ke versi ${legalPage.version}? Versi aktif saat ini akan diarsipkan.`)) {
      router.post(`/admin/legal/restore/${legalPage.id}`, {}, {
        onSuccess: () => {
          router.visit('/admin/legal');
        }
      });
    }
  };

  const handleForceDelete = () => {
    if (confirm(`Hapus permanen versi ${legalPage.version}? Tindakan ini tidak dapat dibatalkan!`)) {
      router.delete(`/admin/legal/archived/${legalPage.id}/force`, {
        onSuccess: () => {
          router.visit(`/admin/legal/${originalSlug}/history`);
        }
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/legal/${originalSlug}/history`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Riwayat
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Versi Diarsipkan</h1>
              <p className="text-gray-500 mt-1">{legalPage.title}</p>
            </div>
          </div>
        </div>

        {/* Version Info Card */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-xl">Versi {legalPage.version}</CardTitle>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                    <Archive className="h-3 w-3 mr-1" />
                    Diarsipkan
                  </Badge>
                </div>
                <CardDescription className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dipublikasikan: {formatDate(legalPage.published_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Diarsipkan: {formatDate(legalPage.deleted_at)}
                  </div>
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleRestore}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Pulihkan Versi Ini
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleForceDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus Permanen
                </Button>
              </div>
              </div>
          </CardHeader>
        </Card>

        {/* Content Display */}
        <Card>
          <CardHeader>
            <CardTitle>Konten Dokumen</CardTitle>
            <CardDescription>
              Ini adalah konten yang diarsipkan dari versi {legalPage.version}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div 
                className="whitespace-pre-wrap text-gray-700"
                dangerouslySetInnerHTML={{ __html: legalPage.content.replace(/\n/g, '<br/>') }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Warning Box */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-200">
                  <Clock className="h-5 w-5 text-yellow-800" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">Versi Diarsipkan</h3>
                <p className="text-sm text-yellow-800">
                  Ini adalah versi yang diarsipkan dan saat ini tidak aktif. Untuk menjadikan versi ini aktif kembali, 
                  klik "Pulihkan Versi Ini" di atas. Versi aktif saat ini akan otomatis diarsipkan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}