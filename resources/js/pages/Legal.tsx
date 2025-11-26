import React from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TextFormatMarkdown from '@/components/text-mark-down';
import { FileText } from 'lucide-react';

interface LegalPageProps {
  legalPage: {
    id: number;
    title: string;
    slug: string;
    type: string;
    version: string;
    content: string;
    published_at: string;
  } | null;
}

export default function Legal({ legalPage }: LegalPageProps) {
  // fallback jika legalPage null
  if (!legalPage) {
    return (
      <GuestLayout>
        <Head title="Legal Page Not Found" />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Legal page tidak ditemukan.</p>
        </div>
      </GuestLayout>
    );
  }

  const formattedDate = legalPage.published_at
    ? new Date(legalPage.published_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  return (
    <GuestLayout>
      <Head title={`${legalPage.title} - Homsjogja`}>
        <meta
          name="description"
          content={`${legalPage.title} terbaru dari Homsjogja.`}
        />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="min-h-screen bg-brand-background">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {legalPage.title}
            </h1>
            <Badge className="bg-brand-accent-20 text-brand-accent">
              Terakhir diperbarui: {formattedDate}
            </Badge>
          </div>

          {/* Content */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-brand-primary" />
                Konten
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
              {legalPage.content ? (
                <TextFormatMarkdown text={legalPage.content} />
              ) : (
                <p className="text-muted-foreground">Konten belum tersedia.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </GuestLayout>
  );
}