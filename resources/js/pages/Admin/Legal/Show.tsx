import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@inertiajs/react';
import TextFormatMarkdown from '@/components/text-mark-down';
import { type PageProps } from '@/types';
import { ArrowLeft } from 'lucide-react';

interface ShowLegalPageProps {
  legalPage: {
    id: number;
    title: string;
    slug: string;
    version: number;
    published_at: string | null;
    content: string;
  };
}

export default function ShowLegalPage({ legalPage }: ShowLegalPageProps) {
  return (
    <AdminLayout
      title={`Legal Page: ${legalPage.title}`}
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Legal Pages', href: '/admin/legal' },
        { title: legalPage.title },
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{legalPage.title}</h1>
          <Link href="/admin/legal">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Slug</h2>
            <Badge variant="secondary">{legalPage.slug}</Badge>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Version</h2>
            <p>{legalPage.version}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Published At</h2>
            <p>{legalPage.published_at ? new Date(legalPage.published_at).toLocaleDateString() : '-'}</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Content</h2>
          <div className="border rounded p-4 bg-gray-50">
            <TextFormatMarkdown text={legalPage.content} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
