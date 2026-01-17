export interface SeoData {
    title: string;
    description: string;
    image: string;
    url: string;
    type: 'website' | 'product' | 'article';
    og: {
        title: string;
        description: string;
        image: string;
        url: string;
        type: string;
    };
    twitter: {
        card: string;
        title: string;
        description: string;
        image: string;
    };
}

export interface GlobalSeo {
    organizationSchema: string;
    siteName: string;
    defaultImage: string;
}
