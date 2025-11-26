import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  Clock, 
  Edit, 
  Trash2, 
  History,
  Eye,
  RotateCcw,
  Archive,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface LegalPage {
  id: number;
  title: string;
  slug: string;
  type: string;
  version: string;
  content: string;
  published_at: string;
  deleted_at?: string;
}

interface LegalPageGroup {
  active: LegalPage;
  archived: LegalPage[];
  total_archived: number;
}

interface IndexProps {
  legalPages: LegalPageGroup[];
  typeSlugMap: Record<string, string>;
}

export default function LegalPagesIndex({ legalPages, typeSlugMap }: IndexProps) {
  const [expandedCards, setExpandedCards] = useState<number[]>([]);

  const toggleExpanded = (index: number) => {
    setExpandedCards(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleDelete = (slug: string, title: string) => {
    if (confirm(`Apakah Anda yakin ingin mengarsipkan "${title}"? Dokumen akan dipindahkan ke tempat sampah.`)) {
      router.post(`/admin/legal/${slug}/archive`, {}, { 
        preserveScroll: true,
        onSuccess: () => {
          router.reload();
        }
      });
    }
  };

  const handleDestroyAll = (slug: string, title: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus PERMANEN "${title}" dan semua versinya? Tindakan ini tidak dapat dibatalkan!`)) {
      router.delete(`/admin/legal/${slug}/destroy-all`, { 
        preserveScroll: true 
      });
    }
  };

  const handleRestore = (id: number, version: string) => {
    if (confirm(`Pulihkan ke versi ${version}? Versi saat ini akan diarsipkan.`)) {
      router.post(`/admin/legal/restore/${id}`, {}, {
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
        'tos':             'bg-blue-100 text-blue-800 border-blue-200',     // Ketentuan Layanan
        'privacy':         'bg-purple-100 text-purple-800 border-purple-200', // Kebijakan Privasi
        'cookies':         'bg-orange-100 text-orange-800 border-orange-200',   // Kebijakan Cookies
        'refund-policy':   'bg-green-100 text-green-800 border-green-200',      // Kebijakan Pengembalian Dana
        'payment-policy':  'bg-teal-100 text-teal-800 border-teal-200',         // Kebijakan Pembayaran
        'copyright-policy':'bg-gray-100 text-gray-800 border-gray-200',         // Hak Cipta / Kebijakan Hak Cipta
        'disclaimer':      'bg-red-100 text-red-800 border-red-200',            // Penafian
      };
      
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <AdminLayout
      title="Halaman Hukum" // Legal Page
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Halaman Hukum'}, // Legal Pages
      ]}
    >
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dokumen Hukum</h1> {/* Legal Documents */}
            <p className="text-gray-500 mt-1">Kelola halaman hukum dan versinya</p> {/* Manage your legal pages and their versions */}
          </div>
          <Link href="/admin/legal/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Halaman Hukum {/* Add Legal Page */}
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Dokumen</p> {/* Total Documents */}
                  <p className="text-2xl font-bold">{legalPages.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Versi</p> {/* Total Versions */}
                  <p className="text-2xl font-bold">
                    {legalPages.reduce((acc, group) => acc + group.total_archived + 1, 0)}
                  </p>
                </div>
                <History className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Diarsipkan</p> {/* Archived */}
                  <p className="text-2xl font-bold">
                    {legalPages.reduce((acc, group) => acc + group.total_archived, 0)}
                  </p>
                </div>
                <Archive className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Link href="/admin/legal/trash">
                    <Button variant="outline" size="sm">
                      Lihat Sampah {/* View Trash */}
                    </Button>
                  </Link>
                </div>
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legal Documents Cards */}
        {legalPages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Dokumen Hukum</h3> {/* No Legal Documents */}
              <p className="text-gray-500 mb-4">Mulai dengan membuat dokumen hukum pertama Anda.</p> {/* Get started by creating your first legal document. */}
              <Link href="/admin/legal/create">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Dokumen Hukum {/* Create Legal Document */}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {legalPages.map((group, index) => (
              <Card key={group.active.id} className="overflow-hidden border-l-4 border-l-blue-500">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{group.active.title}</CardTitle>
                        <Badge className={`${getTypeColor(group.active.type)} border`}>
                          {group.active.type.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Aktif {/* Active */}
                          </span>
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(group.active.published_at)}
                        </span>
                        <span className="font-semibold text-blue-600">
                          {group.active.version}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">
                          /{group.active.slug}
                        </span>
                      </CardDescription>
                    </div>
                    
                    {/* Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Tindakan {/* Actions */}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Tindakan Cepat</DropdownMenuLabel> {/* Quick Actions */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/legal/${group.active.slug}`} target="_blank">
                            <Eye className="h-4 w-4 mr-2" />
                            Lihat Halaman Publik {/* View Public Page */}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/legal/${group.active.slug}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Dokumen {/* Edit Document */}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/legal/${group.active.slug}/history`}>
                            <History className="h-4 w-4 mr-2" />
                            Lihat Semua Riwayat {/* View All History */}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(group.active.slug, group.active.title)}
                          className="text-orange-600"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Arsipkan Dokumen {/* Archive Document */}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDestroyAll(group.active.slug, group.active.title)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Hapus Permanen {/* Delete Permanently */}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* Content Preview */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {group.active.content.substring(0, 200)}...
                    </p>
                  </div>

                  {/* History Section */}
                  {group.archived.length > 0 && (
                    <Collapsible 
                      open={expandedCards.includes(index)}
                      onOpenChange={() => toggleExpanded(index)}
                    >
                      <div className="border-t pt-4">
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-between hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-2">
                              <History className="h-4 w-4" />
                              <span className="font-semibold">
                                Riwayat Versi ({group.total_archived} diarsipkan) {/* Version History ({group.total_archived} archived) */}
                              </span>
                            </span>
                            {expandedCards.includes(index) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-4 space-y-3">
                          {group.archived.map((archivedDoc) => (
                            <div 
                              key={archivedDoc.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200">
                                  <Clock className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-900">
                                      {archivedDoc.version}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                      Diarsipkan {/* Archived */}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(archivedDoc.published_at)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Link href={`/admin/legal/archived/${archivedDoc.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRestore(archivedDoc.id, archivedDoc.version)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Pulihkan {/* Restore */}
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {group.total_archived > 10 && (
                            <Link href={`/admin/legal/${group.active.slug}/history`}>
                              <Button variant="outline" size="sm" className="w-full">
                                Lihat Semua {group.total_archived} Versi {/* View All {group.total_archived} Versions */}
                              </Button>
                            </Link>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Link href={`/admin/legal/${group.active.slug}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit {/* Edit */}
                      </Button>
                    </Link>
                    <Link href={`/legal/${group.active.slug}`} target="_blank">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Lihat {/* View */}
                      </Button>
                    </Link>
                    {group.total_archived > 0 && (
                      <Link href={`/admin/legal/${group.active.slug}/history`}>
                        <Button variant="outline" size="sm">
                          <History className="h-4 w-4 mr-2" />
                          Riwayat Lengkap {/* Full History */}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}