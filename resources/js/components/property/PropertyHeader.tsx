import React from 'react';
import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Heart, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PropertyWithDetails } from '@/types/property';

interface PropertyHeaderProps {
  property: PropertyWithDetails;
}

export const PropertyHeader: React.FC<PropertyHeaderProps> = ({ property }) => {
  const { t } = useTranslation();

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: property.name,
          text: t('properties.share_message'),
          url,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert(t('properties.link_copied'));
    }
  };

  return (
    <div className="mb-10">

      {/* SEO: Breadcrumb with Schema.org BreadcrumbList */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-3" itemScope itemType="https://schema.org/BreadcrumbList">
        <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link href="/" itemProp="item" className="hover:text-brand-primary transition-colors font-medium">
            <span itemProp="name">{t('nav.home')}</span>
          </Link>
          <meta itemProp="position" content="1" />
        </span>
        <span className="text-muted-foreground">›</span>
        <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <Link href="/properties" itemProp="item" className="hover:text-brand-primary transition-colors font-medium">
            <span itemProp="name">{t('properties.properties')}</span>
          </Link>
          <meta itemProp="position" content="2" />
        </span>
        <span className="text-muted-foreground">›</span>
        <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
          <span className="text-brand-primary font-semibold" itemProp="name">
            {property.name}
          </span>
          <meta itemProp="position" content="3" />
        </span>
      </nav>

      {/* SEO: Product Schema with Microdata */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" itemScope itemType="https://schema.org/Product">

        {/* Nama & Featured */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground" itemProp="name">
              {property.name}
            </h1>

            {property.is_featured && (
              <Badge className="bg-brand-accent text-white border-0 shadow-sm">
                <Star className="h-3 w-3 mr-1" />
                {t('properties.featured')}
              </Badge>
            )}
          </div>

          {/* SEO: Offer Schema (Price, Currency, Availability) */}
          <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
            <meta itemProp="price" content={property.base_rate.toString()} />
            <meta itemProp="priceCurrency" content="IDR" />
            <meta itemProp="availability" content="https://schema.org/InStock" />
            <link itemProp="url" href={typeof window !== 'undefined' ? window.location.href : ''} />
          </div>

          {/* SEO: Description for Product */}
          <meta itemProp="description" content={property.description?.substring(0, 200) || property.name} />
        </div>

        {/* Tombol Aksi */}
        <div className="flex gap-2 md:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-brand-primary/40 hover:bg-brand-primary-10 hover:border-brand-primary transition-all"
          >
            <Heart className="h-4 w-4 text-brand-primary" />
            <span className="hidden md:inline ml-2">{t('properties.save')}</span>
          </Button>

          {/* SHARE */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="border-brand-primary/40 hover:bg-brand-primary-10 hover:border-brand-primary transition-all"
          >
            <Share2 className="h-4 w-4 text-brand-primary" />
            <span className="hidden md:inline ml-2">{t('properties.share')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
