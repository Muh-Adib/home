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
    const rawTitle = title || seo?.title || globalSeo.siteName;
    // Truncate title to 60 chars to avoid "Title too long" SEO warnings
    const metaTitle = rawTitle.length > 60 ? rawTitle.substring(0, 57) + '...' : rawTitle;
    const metaDescription = description || seo?.description || `${globalSeo.siteName} — Temukan homestay, villa, dan penginapan terbaik di Yogyakarta.`;
    const metaImage = image || seo?.image || globalSeo.defaultImage;
    const canonicalUrl = seo?.url || '';

    return (
        <Head>
            {/* Primary Meta Tags */}
            <title>{metaTitle}</title>
            <meta name="title" content={metaTitle} />
            <meta name="description" content={metaDescription} />
            {/* Language Meta Tags for SEO */}
            <meta httpEquiv="content-language" content="id" />
            <meta name="language" content="Indonesian" />
            <meta property="og:locale" content="id_ID" />
            <meta property="og:locale:alternate" content="en_US" />

            {/* Hreflang for bilingual content */}
            <link rel="alternate" hrefLang="id" href={canonicalUrl} />
            <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

            {/* Robots — single tag, noIndex prop takes precedence */}
            <meta name="robots" content={noIndex ? 'noindex, follow' : (seo?.robots || 'index, follow')} />

            {/* Canonical URL */}
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={seo?.og.type || 'website'} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={seo?.og.title || metaTitle} />
            <meta property="og:description" content={seo?.og.description || metaDescription} />
            <meta property="og:image" content={seo?.og.image || metaImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={seo?.og.title || metaTitle} />
            <meta property="og:site_name" content={globalSeo.siteName} />

            {/* Twitter */}
            <meta name="twitter:card" content={seo?.twitter.card || 'summary_large_image'} />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={seo?.twitter.title || metaTitle} />
            <meta name="twitter:description" content={seo?.twitter.description || metaDescription} />
            <meta name="twitter:image" content={seo?.twitter.image || metaImage} />

            {/* Anti-Blank Page for SSR/SEO when JS is disabled */}
            <noscript>
                {`<style>
                    /* Force visibility for framer-motion elements during SSR or when JS is disabled */
                    [style*="opacity: 0"] {
                        opacity: 1 !important;
                        transform: none !important;
                    }
                    /* Backup generic rule if syntax differs */
                    .hero-section, section, div {
                        opacity: 1 !important;
                    }
                </style>`}
            </noscript>
        </Head>
    );
}
