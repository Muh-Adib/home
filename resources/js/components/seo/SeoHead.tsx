import { Head } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

interface SeoHeadProps {
    title?: string;
    description?: string;
    image?: string;
    noIndex?: boolean;
}

export function SeoHead({ title, description, image, noIndex = false }: SeoHeadProps) {
    const { seo, globalSeo } = usePage<PageProps>().props;

    // Merge custom props with page SEO data
    const metaTitle = title || seo?.title || globalSeo.siteName;
    const metaDescription = description || seo?.description || '';
    const metaImage = image || seo?.image || globalSeo.defaultImage;
    const canonicalUrl = seo?.url || (typeof window !== 'undefined' ? window.location.href : '');

    return (
        <Head>
            {/* Primary Meta Tags */}
            <title>{metaTitle}</title>
            <meta name="title" content={metaTitle} />
            <meta name="description" content={metaDescription} />
            {noIndex && <meta name="robots" content="noindex, follow" />}

            {/* Language Meta Tags for SEO */}
            <meta httpEquiv="content-language" content="id" />
            <meta name="language" content="Indonesian" />
            <meta property="og:locale" content="id_ID" />

            {/* Robot */}
            <meta name="robots" content={seo?.robots || 'index, follow'} />

            {/* Canonical URL */}
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={seo?.og.type || 'website'} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={seo?.og.title || metaTitle} />
            <meta property="og:description" content={seo?.og.description || metaDescription} />
            <meta property="og:image" content={seo?.og.image || metaImage} />

            {/* Twitter */}
            <meta name="twitter:card" content={seo?.twitter.card || 'summary_large_image'} />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={seo?.twitter.title || metaTitle} />
            <meta name="twitter:description" content={seo?.twitter.description || metaDescription} />
            <meta name="twitter:image" content={seo?.twitter.image || metaImage} />
        </Head>
    );
}
