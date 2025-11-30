import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, usePage } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  MapPin,
  Users,
  Bed,
  Bath,
  Star,
  Heart,
  Crown
} from 'lucide-react';
import { Property } from '@/types/property';
import { formatCurrency } from '@/utils/formatCurrency';
import AmenityItem from '@/components/AmenityItem';
import { useTranslation } from 'react-i18next';

interface PropertyCardEnhancedProps {
  property: Property;
  className?: string;
  showLocationBadge?: boolean;
  showRating?: boolean;
}

export default function PropertyCardEnhanced({
  property,
  className = '',
  showLocationBadge = true,
  showRating = true
}: PropertyCardEnhancedProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { t } = useTranslation();

  const { url } = usePage();
  const searchParams = new URLSearchParams(url.split('?')[1]);

  // Ambil nilai query param
  const check_in = searchParams.get('check_in') ?? '';
  const check_out = searchParams.get('check_out') ?? '';
  const guests = searchParams.get('guests') ?? '';

  const hasQuery = check_in && check_out && guests;

  const getLocationBadge = (address: string) => {
    const addressLower = address.toLowerCase();
    if (addressLower.includes('malioboro')) return { text: 'Dekat Malioboro', color: 'bg-blue-500' };
    if (addressLower.includes('keraton') || addressLower.includes('kraton')) return { text: 'Area Keraton', color: 'bg-purple-500' };
    if (addressLower.includes('taman sari')) return { text: 'Taman Sari', color: 'bg-green-500' };
    if (addressLower.includes('kotagede')) return { text: 'Kotagede', color: 'bg-orange-500' };
    return { text: 'Jogja', color: 'bg-gray-500' };
  };

  const locationBadge = getLocationBadge(property.address);

  // Harga diskon tiruan
  const currentRate = property.base_rate || 0;
  const inflatedRate = Math.round(currentRate * 1.17);
  const discountAmount = inflatedRate - currentRate;
  const discountPercentage = Math.round((discountAmount / inflatedRate) * 100);

  return (
    <motion.div
      className={`group ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
    >
      {/* Link seluruh card */}
      <Link href={
        hasQuery
          ? `/properties/${property.slug}?check_in=${check_in}&check_out=${check_out}&guests=${guests}`
          : `/properties/${property.slug}`
      } className="block">
        <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 shadow-lg bg-card group-hover:shadow-xl cursor-pointer gap-0 md:gap-3">

          {/* Gambar Properti */}
          <div className="aspect-[5/4] md:aspect-[4/3] bg-muted relative overflow-hidden rounded-lg">
            {property.media?.length > 0 && property.media[0]?.url && !imageError ? (
              <img
                src={property.media[0].url}
                alt={property.name}
                className={`w-full h-full object-cover transition-transform duration-700 ${imageLoaded ? 'scale-100' : 'scale-110'
                  } group-hover:scale-110`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-10 to-primary-5">
                <Building2 className="h-10 w-10 md:h-16 md:w-16 text-primary-60" />
                <span className="sr-only">Gambar tidak tersedia</span>
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent group-hover:from-black/40 transition-all duration-300"></div>

            {/* Badge lokasi & featured */}
            <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col gap-1 md:gap-2">
              {property.is_featured && (
                <Badge className={`${locationBadge.color} text-white border-0 flex items-center gap-1 px-1.5 py-0.5 text-[10px] md:text-xs`}>
                  <Crown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  Featured
                </Badge>
              )}

              {showLocationBadge && (
                <Badge className="bg-background/95 text-foreground border-0 flex items-center px-1.5 py-0.5 text-[10px] md:text-xs">
                  <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                  {locationBadge.text}
                </Badge>
              )}
            </div>

            {/* Tombol like */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsLiked(!isLiked);
              }}
              className={`absolute top-2 right-2 md:top-3 md:right-3 bg-background hover:bg-background shadow-md rounded-full p-1.5 md:p-2 transition-all duration-300 ${isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              aria-label={isLiked ? 'Hapus dari favorit' : 'Tambah ke favorit'}
            >
              <Heart
                className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${isLiked ? 'text-red-500 fill-current' : 'text-muted-foreground'
                  }`}
              />
            </button>

            {/* Rating */}
            {showRating && (
              <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 bg-background rounded-md px-1.5 py-0.5 md:px-2 md:py-1 flex items-center gap-1 shadow-sm md:shadow-md text-[10px] md:text-xs">
                <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 fill-current" />
                <span className="font-medium text-foreground">4.5</span>
              </div>
            )}
          </div>

          <CardContent className="p-4 md:p-6">
            {/* Info utama */}
            <div className="space-y-1 md:space-y-2">
              <h3 className="text-base md:text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {property.name}
              </h3>

              {/* Lokasi */}
              <div className="hidden md:flex items-center text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate" title={property.address}>
                  {property.address}
                </span>
              </div>

              {/* Deskripsi */}
              <p className="hidden md:line-clamp-3 text-muted-foreground text-sm leading-relaxed" title={property.description}>
                {property.description}
              </p>
            </div>

            {/* Statistik properti */}
            <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-2 md:mt-4">
              <div className="flex items-center" title={`${property.bedroom_count} Kamar Tidur`}>
                <Bed className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="font-medium">{property.bedroom_count}</span>
              </div>

              <div className="flex items-center" title={`${property.bathroom_count} Kamar Mandi`}>
                <Bath className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="font-medium">{property.bathroom_count}</span>
              </div>

              <div className="flex items-center" title={`Maksimal ${property.capacity} tamu`}>
                <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="font-medium">{property.capacity}</span>
              </div>
            </div>

            {/* Fasilitas */}
            {property.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-0.5 md:gap-1 mt-2 md:mt-3">
                {property.amenities.slice(0, 5).map((amenity, index) => (
                  <AmenityItem
                    key={`amenity-${amenity.id || amenity.name}-${index}`}
                    amenity={amenity}
                    variant="badge"
                    showName={false}
                    className="text-[10px] md:text-xs py-0.5 px-1 md:px-2"
                  />
                ))}

                {property.amenities.length > 5 && (
                  <Badge variant="outline" className="text-[10px] md:text-xs bg-gray-50 py-0.5 px-1 md:px-2">
                    +{property.amenities.length - 5} {t('common.more')}
                  </Badge>
                )}
              </div>
            )}

            {/* Harga */}
            <div className="mt-5 pt-4 border-t border-border text-right space-y-1">

              {/* Harga coret */}
              <div className="text-xs text-destructive line-through leading-none h-4 flex justify-end items-center">
                {formatCurrency(inflatedRate)}
              </div>

              {/* Harga utama */}
              <div className="flex flex-col items-end leading-tight">
                <span className="text-xl font-bold text-brand-accent">
                  {formatCurrency(currentRate)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / malam
                </span>
              </div>

              {/* Badge + Hemat */}
              <div className="flex justify-end items-center gap-2 text-xs leading-none h-4">
                <Badge variant="destructive" className="text-[10px] py-0.5 px-1.5 leading-none">
                  -{discountPercentage}%
                </Badge>
                <span className="text-green-600 font-semibold leading-none">
                  Hemat {formatCurrency(discountAmount)}
                </span>
              </div>

            </div>

          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
