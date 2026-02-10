import { Head } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

interface SchemaOrgProps {
    schema?: string; // Page-specific schema (optional)
}

export function SchemaOrg({ schema }: SchemaOrgProps) {
    const {
        globalSeo,
        schema: pageSchema,
        // GEO: Additional schemas
        webSiteSchema,
        faqSchema,
        breadcrumbSchema,
        localBusinessSchema,
        videoSchema
    } = usePage<PageProps>().props;

    return (
        <Head>
            {/* Global Organization Schema */}
            {globalSeo?.organizationSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: globalSeo.organizationSchema,
                    }}
                />
            )}

            {/* Global Website Schema (Search Box) */}
            {webSiteSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: webSiteSchema,
                    }}
                />
            )}

            {/* Page-specific Schema (Product/Property) */}
            {(schema || pageSchema) && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: schema || pageSchema || '',
                    }}
                />
            )}

            {/* GEO: FAQ Schema for AI Q&A */}
            {faqSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: faqSchema,
                    }}
                />
            )}

            {/* GEO: Breadcrumb Schema for Navigation Context */}
            {breadcrumbSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: breadcrumbSchema,
                    }}
                />
            )}

            {/* GEO: Local Business Schema for Location-based Search */}
            {localBusinessSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: localBusinessSchema,
                    }}
                />
            )}

            {/* SEO: Video Schema for TikTok Tours */}
            {videoSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: videoSchema,
                    }}
                />
            )}
        </Head>
    );
}
