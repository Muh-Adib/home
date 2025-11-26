import React from 'react';
import { Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Eye,
  RotateCcw,
  Clock,
  Trash2,
  Calendar,
  FileText,
  Download
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
  deleted_at?: string;
}

interface PaginatedArchived {
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

interface HistoryProps {
  active: LegalPage;
  archived: PaginatedArchived;
  slug: string;
}

export default function LegalHistory({ active, archived, slug }: HistoryProps) {
  const handleRestore = (id: number, version: string) => {
    if (confirm(`Restore to version ${version}? Current version will be archived.`)) {
      router.post(`/admin/legal/restore/${id}`, {}, {
        preserveScroll: true,
        onSuccess: () => {
          router.reload();
        }
      });
    }
  };

  const handleForceDelete = (id: number, version: string) => {
    if (confirm(`Permanently delete version ${version}? This cannot be undone!`)) {
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/legal">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Version History</h1>
              <p className="text-gray-500 mt-1">{active.title}</p>
            </div>
          </div>
        </div>

        {/* Current Active Version */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="bg-gradient-to-r from-green-50 to-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-xl">Current Version</CardTitle>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Active
                    </span>
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    {active.version}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Published: {formatDate(active.published_at)}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href={`/legal/${slug}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Public
                  </Button>
                </Link>
                <Link href={`/admin/legal/${slug}/edit`}>
                  <Button size="sm">
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 line-clamp-3">
                {active.content.substring(0, 300)}...
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Archived Versions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Archived Versions ({archived.total})
            </h2>
          </div>

          {archived.data.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Archived Versions</h3>
                <p className="text-gray-500">This is the first version of this document.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {archived.data.map((version, index) => (
                <Card key={version.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Left side - Version info */}
                      <div className="flex gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 flex-shrink-0">
                          <FileText className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-lg text-gray-900 font-mono">
                              {version.version}
                            </span>
                            <Badge variant="secondary">Archived</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                            <Calendar className="h-4 w-4" />
                            {formatDate(version.published_at)}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {version.content.substring(0, 200)}...
                          </p>
                        </div>
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Link href={`/admin/legal/archived/${version.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRestore(version.id, version.version)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleForceDelete(version.id, version.version)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {archived.last_page > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {archived.from} - {archived.to} of {archived.total} versions
              </div>
              <div className="flex gap-2">
                {archived.prev_page_url && (
                  <Link href={archived.prev_page_url}>
                    <Button variant="outline" size="sm">
                      Previous
                    </Button>
                  </Link>
                )}
                <span className="flex items-center px-4 text-sm text-gray-600">
                  Page {archived.current_page} of {archived.last_page}
                </span>
                {archived.next_page_url && (
                  <Link href={archived.next_page_url}>
                    <Button variant="outline" size="sm">
                      Next
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}