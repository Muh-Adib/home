import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@inertiajs/react';
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
      <Link href={`/properties/${property.slug}`} className="block">
        <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 shadow-lg bg-card group-hover:shadow-xl cursor-pointer">
          
          {/* Gambar Properti */}
          <div className="aspect-[4/3] bg-muted relative overflow-hidden">
            {property.media && property.media.length > 0 && property.media[0]?.url && !imageError ? (
              <img
                src={property.media[0].url}
                alt={property.name}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  imageLoaded ? 'scale-100' : 'scale-110'
                } group-hover:scale-110`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-10 to-primary-5">
                <Building2 className="h-16 w-16 text-primary-60" />
                <span className="sr-only">Gambar tidak tersedia</span>
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black-20 to-transparent group-hover:from-black-30 transition-all duration-300"></div>

            {/* Badge lokasi & featured */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {property.is_featured && (
                <Badge className={`${locationBadge.color} text-white border-0 flex items-center gap-1`}>
                  <Crown className="h-3 w-3" />
                  Featured
                </Badge>
              )}
              {showLocationBadge && (
                <Badge className="bg-background/95 text-foreground border-0 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
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
              className={`absolute top-3 right-3 bg-background hover:bg-background shadow-lg rounded-full p-2 transition-all duration-300 ${
                isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              aria-label={isLiked ? 'Hapus dari favorit' : 'Tambah ke favorit'}
            >
              <Heart className={`h-4 w-4 transition-colors ${isLiked ? 'text-red-500 fill-current' : 'text-muted-foreground'}`} />
            </button>

            {/* Rating */}
            {showRating && (
              <div className="absolute bottom-3 left-3 bg-background rounded-lg px-2 py-1 flex items-center gap-1 shadow-md">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="text-xs font-medium text-foreground">4.5</span>
              </div>
            )}
          </div>

          <CardContent className="p-4 md:p-6">
            {/* Info utama */}
            <div className="space-y-2">
              <h3 className="text-lg md:text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {property.name}
              </h3>

              <div className="flex items-center text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate" title={property.address}>
                  {property.address}
                </span>
              </div>

              <p className="text-muted-foreground text-sm line-clamp-2" title={property.description}>
                {property.description}
              </p>
            </div>

            {/* Statistik properti */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
              <div className="flex items-center" title={`${property.bedroom_count} Kamar Tidur`}>
                <Bed className="h-4 w-4 mr-1" />
                <span className="font-medium">{property.bedroom_count}</span>
              </div>
              <div className="flex items-center" title={`${property.bathroom_count} Kamar Mandi`}>
                <Bath className="h-4 w-4 mr-1" />
                <span className="font-medium">{property.bathroom_count}</span>
              </div>
              <div className="flex items-center" title={`Maksimal ${property.capacity} tamu`}>
                <Users className="h-4 w-4 mr-1" />
                <span className="font-medium">{property.capacity}</span>
              </div>
            </div>

            {/* Fasilitas */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {property.amenities.slice(0, 5).map((amenity, index) => (
                  <AmenityItem
                    key={`amenity-${amenity.id || amenity.name}-${index}`}
                    amenity={amenity}
                    variant="badge"
                    showName={false}
                  />
                ))}
                {property.amenities.length > 5 && (
                  <Badge variant="outline" className="text-xs bg-gray-50">
                    +{property.amenities.length - 5} {t('common.more')}
                  </Badge>
                )}
              </div>
            )}

            {/* Harga */}
            <div className="mt-5 pt-4 border-t border-border space-y-1">
              <div className="text-sm text-destructive line-through">
                {formatCurrency(inflatedRate)}
              </div>
              <div className="text-2xl font-bold text-brand-accent">
                {formatCurrency(currentRate)} <span className="text-sm text-muted-foreground font-normal">/ malam</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="destructive" className="text-[10px] py-0.5 px-1.5">
                  -{discountPercentage}%
                </Badge>
                <span className="text-green-600 font-semibold">
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
