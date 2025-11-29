import React from 'react';
import { Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
 ArrowLeft,
 Trash2,
 RotateCcw,
 Calendar,
 Eye,
 AlertTriangle,
 Search
} from 'lucide-react';

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

interface PaginatedTrashed {
 data: LegalPage[];
 current_page: number;
 last_page: number;
 per_page: number;
 total: number;
 from: number;
 to: number;
 prev_page_url?: string;
 next_page_url?: string;
}

interface TrashProps {
 trashedPages: PaginatedTrashed;
}

export default function LegalTrash({ trashedPages }: TrashProps) {
 const handleRestore = (id: number, version: string) => {
  if (confirm(`Pulihkan versi ${version}? Ini akan menjadi versi aktif.`)) {
   router.post(`/admin/legal/restore/${id}`, {}, {
    preserveScroll: true,
    onSuccess: () => {
     router.reload();
    }
   });
  }
 };

 const handleForceDelete = (id: number, version: string) => {
  if (confirm(`Hapus permanen versi ${version}? Tindakan ini tidak dapat dibatalkan!`)) {
   router.delete(`/admin/legal/archived/${id}/force`, {
    preserveScroll: true,
    onSuccess: () => {
     router.reload();
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

 const getTypeColor = (type: string) => {
       const colors: Record<string, string> = {
        'tos':             'bg-blue-100 text-blue-800 border-blue-200',     // Terms of Service
        'privacy':         'bg-purple-100 text-purple-800 border-purple-200', // Privacy Policy
        'cookies':         'bg-orange-100 text-orange-800 border-orange-200',   // Cookies Policy
        'refundpolicy':   'bg-green-100 text-green-800 border-green-200',      // Refund Policy
        'paymentpolicy':  'bg-teal-100 text-teal-800 border-teal-200',         // Payment Policy
        'copyrightpolicy':'bg-gray-100 text-gray-800 border-gray-200',         // Copy Rights / Copyright Policy
        'disclaimer':      'bg-red-100 text-red-800 border-red-200',            // Disclaimer
      };
  return colors[type] || 'bg-gray-100 text-gray-800';
 };

 const getOriginalSlug = (slug: string) => {
  return slug.split('-')[0];
 };

 return (
  <div className="min-h-screen bg-gray-50 p-6">
   <div className="max-w-7xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
     <div className="flex items-center gap-4">
      <Link href="/admin/legal">
       <Button variant="outline" size="sm">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali ke Dokumen
       </Button>
      </Link>
      <div>
       <h1 className="text-3xl font-bold text-gray-900">Sampah</h1>
       <p className="text-gray-500 mt-1">Dokumen hukum yang diarsipkan dan dihapus</p>
      </div>
     </div>
    </div>

    {/* Warning Banner */}
    <Card className="border-red-200 bg-red-50">
     <CardContent className="pt-6">
      <div className="flex gap-3">
       <div className="flex-shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-200">
         <AlertTriangle className="h-5 w-5 text-red-800" />
        </div>
       </div>
       <div className="flex-1">
        <h3 className="font-semibold text-red-900 mb-1">Perhatian: Area Sampah</h3>
        <p className="text-sm text-red-800">
         Item di sampah adalah versi yang diarsipkan. Anda dapat memulihkannya atau menghapusnya secara permanen. 
         Penghapusan permanen tidak dapat dibatalkan!
        </p>
       </div>
      </div>
     </CardContent>
    </Card>

    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
     <Card>
      <CardContent className="pt-6">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-sm text-gray-500">Total di Sampah</p>
         <p className="text-2xl font-bold">{trashedPages.total}</p>
        </div>
        <Trash2 className="h-8 w-8 text-red-500" />
       </div>
      </CardContent>
     </Card>
    </div>

    {/* Trashed Items */}
    {trashedPages.data.length === 0 ? (
     <Card>
      <CardContent className="py-12 text-center">
       <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
       <h3 className="text-lg font-semibold text-gray-900 mb-2">Sampah Kosong</h3>
       <p className="text-gray-500">Tidak ada dokumen yang diarsipkan ditemukan.</p>
      </CardContent>
     </Card>
    ) : (
     <div className="space-y-4">
      {trashedPages.data.map((page) => (
       <Card key={page.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
         <div className="flex items-start justify-between">
          {/* Left side */}
          <div className="flex gap-4 flex-1">
           <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 flex-shrink-0">
            <Trash2 className="h-6 w-6 text-red-600" />
           </div>
           <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
             <h3 className="font-semibold text-lg text-gray-900">
              {page.title}
             </h3>
             <Badge className={getTypeColor(page.type)}>
              {page.type.toUpperCase()}
             </Badge>
             <Badge variant="outline" className="font-mono">
              {page.version}
             </Badge>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
             <div className="flex items-center gap-2">
              <span className="font-medium">Slug Asli:</span>
              <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">
               /{getOriginalSlug(page.slug)}
              </code>
             </div>
             <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
               <Calendar className="h-4 w-4" />
               Dipublikasikan: {formatDate(page.published_at)}
              </span>
              <span className="flex items-center gap-1 text-red-600">
               <Trash2 className="h-4 w-4" />
               Dihapus: {formatDate(page.deleted_at)}
              </span>
             </div>
            </div>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
             {page.content.substring(0, 200)}...
            </p>
           </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex flex-col gap-2 ml-4">
           <Link href={`/admin/legal/archived/${page.id}`}>
            <Button variant="outline" size="sm" className="w-full">
             <Eye className="h-4 w-4 mr-2" />
             Lihat
            </Button>
           </Link>
           <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleRestore(page.id, page.version)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full"
           >
            <RotateCcw className="h-4 w-4 mr-2" />
            Pulihkan
           </Button>
           <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleForceDelete(page.id, page.version)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
           >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Permanen
           </Button>
          </div>
         </div>
        </CardContent>
       </Card>
      ))}
     </div>
    )}

    {/* Pagination */}
    {trashedPages.last_page > 1 && (
     <div className="flex items-center justify-between mt-6">
      <div className="text-sm text-gray-600">
       Menampilkan {trashedPages.from} - {trashedPages.to} dari {trashedPages.total} item
      </div>
      <div className="flex gap-2">
       {trashedPages.prev_page_url && (
        <Link href={trashedPages.prev_page_url}>
         <Button variant="outline" size="sm">
          Sebelumnya
         </Button>
        </Link>
       )}
       <span className="flex items-center px-4 text-sm text-gray-600">
        Halaman {trashedPages.current_page} dari {trashedPages.last_page}
       </span>
       {trashedPages.next_page_url && (
        <Link href={trashedPages.next_page_url}>
         <Button variant="outline" size="sm">
          Berikutnya
         </Button>
        </Link>
       )}
      </div>
     </div>
    )}
   </div>
  </div>
 );
}