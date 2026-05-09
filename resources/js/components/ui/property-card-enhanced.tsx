import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  MapPin,
  Users,
  Bed,
  Bath,
  Star,
  Heart,
  Crown,
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
  priority?: boolean;
}

/**
 * Strip markdown formatting and emoji from description text.
 * Handles: **bold**, *italic*, __bold__, _italic_, ~~strike~~,
 * [links](url), `code`, # headings, > blockquotes, - lists, emoji
 */
function stripMarkdownAndEmoji(text: string): string {
  if (!text) return '';
  return text
    // Remove headings
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    // Remove strikethrough
    .replace(/~~(.*?)~~/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Convert links to text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove emoji (Unicode emoji ranges)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    // Collapse excess whitespace
    .replace(/\n{2,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const LOCATION_MAP: Record<string, { text: string; color: string }> = {
  malioboro: { text: 'Dekat Malioboro', color: 'bg-blue-500' },
  keraton: { text: 'Area Keraton', color: 'bg-purple-500' },
  kraton: { text: 'Area Keraton', color: 'bg-purple-500' },
  'taman sari': { text: 'Taman Sari', color: 'bg-emerald-500' },
  kotagede: { text: 'Kotagede', color: 'bg-orange-500' },
  prawirotaman: { text: 'Prawirotaman', color: 'bg-rose-500' },
  kaliurang: { text: 'Kaliurang', color: 'bg-teal-500' },
};

function getLocationBadge(address?: string) {
  if (!address) return { text: 'Jogja', color: 'bg-slate-500' };
  
  const lower = String(address).toLowerCase();
  for (const [key, val] of Object.entries(LOCATION_MAP)) {
    if (lower.includes(key)) return val;
  }
  return { text: 'Jogja', color: 'bg-slate-500' };
}

export default function PropertyCardEnhanced({
  property,
  className = '',
  showLocationBadge = true,
  showRating = true,
  priority = false,
}: PropertyCardEnhancedProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { t } = useTranslation();
  const { url } = usePage();

  // Preserve search query params for deep-link
  const searchParams = new URLSearchParams(url.split('?')[1]);
  const check_in = searchParams.get('check_in') ?? '';
  const check_out = searchParams.get('check_out') ?? '';
  const guests = searchParams.get('guests') ?? '';
  const hasQuery = check_in && check_out && guests;

  const locationBadge = useMemo(() => getLocationBadge(property.address), [property.address]);
  const cleanDescription = useMemo(() => stripMarkdownAndEmoji(property.description), [property.description]);

  // Pricing
  const currentRate = property.current_rate_per_night || property.base_rate;
  const inflatedRate = Math.round(currentRate * 1.17);
  const discountPercentage = Math.round(((inflatedRate - currentRate) / inflatedRate) * 100);

  const href = hasQuery
    ? `/properties/${property.slug}?check_in=${check_in}&check_out=${check_out}&guests=${guests}`
    : `/properties/${property.slug}`;

  // Short description (max ~80 chars for card view)
  const SHORT_DESC_LEN = 60;
  const isDescLong = cleanDescription.length > SHORT_DESC_LEN;
  const shortDescription = isDescLong ? cleanDescription.slice(0, SHORT_DESC_LEN).trimEnd() + '…' : cleanDescription;

  return (
    <motion.div
      className={`group ${className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
        <article className="rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-xl transition-shadow duration-400 cursor-pointer">

          {/* ═══ Image ═══════════════════════════════════════ */}
          <div className="aspect-[4/3] rounded-2xl relative overflow-hidden bg-muted">
            {property.media?.length > 0 && property.media[0]?.url && !imageError ? (
              <img
                src={property.media[0].url}
                alt={property.name}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                className={`w-full h-full object-cover transition-all duration-700 ease-out ${imageLoaded && !priority ? 'opacity-100 scale-100' : (priority ? 'opacity-100 scale-100' : 'opacity-0 scale-105')
                  } group-hover:scale-105`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                <Building2 className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-2">No Image</span>
              </div>
            )}

            {/* Subtle gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Top-left badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
              {property.is_featured && (
                <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-900 text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  <Crown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  Featured
                </span>
              )}
              {showLocationBadge && (
                <span className="inline-flex items-center gap-0.5 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded-full shadow-sm">
                  <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 text-slate-500" />
                  {locationBadge.text}
                </span>
              )}
            </div>

            {/* Discount badge - top right */}
            {discountPercentage > 0 && (
              <span className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                -{discountPercentage}%
              </span>
            )}

            {/* Heart button */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setIsLiked(!isLiked); }}
              className={`absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full p-1.5 md:p-2 shadow-md transition-all duration-200 ${isLiked ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                }`}
              aria-label={isLiked ? 'Hapus dari favorit' : 'Tambah ke favorit'}
            >
              <Heart className={`h-3.5 w-3.5 md:h-4 md:w-4 transition-colors ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-foreground'
                }`} />
            </button>

            {/* Rating badge - bottom left */}
            {showRating && (
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
                <Star className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-[11px] md:text-xs font-semibold text-slate-700">4.5</span>
              </div>            )}
          </div>

          {/* ═══ Content ═════════════════════════════════════ */}
          <div className="p-3.5 md:p-5">

            {/* Name + Address */}
            <h3 className="text-sm md:text-lg font-bold text-foreground leading-tight line-clamp-1 group-hover:text-brand-primary transition-colors duration-200">
              {property.name}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
              <span className="text-[11px] md:text-xs truncate">{property.address}</span>
            </div>
            {/* Description — toggleable, full text always in DOM for SEO */}
            {cleanDescription && (
              <div className="mt-2">
                {/* Full description hidden visually but crawlable by search engines */}
                <span className="sr-only">{cleanDescription}</span>

                {/* Visible: short or full based on toggle */}
                <p className="text-xs md:text-[13px] text-muted-foreground leading-relaxed">
                  {showFullDesc ? cleanDescription : shortDescription}
                </p>

                {isDescLong && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFullDesc(!showFullDesc); }}
                    className="text-[12px] text-brand-primary hover:text-brand-primary/80 font-medium py-2 -my-2 focus:outline-none"
                  >
                    {showFullDesc ? 'Sembunyikan' : 'Selengkapnya'}
                  </button>
                )}
              </div>
            )}

            {/* ── Stats row — full-width grid with text labels ── */}
            <div className="grid grid-cols-3 gap-1.5 md:gap-2 mt-3 md:mt-4">
              <StatItem icon={Bed} value={property.bedroom_count} label="Kamar Tidur" shortLabel="K. Tidur" />
              <StatItem icon={Bath} value={property.bathroom_count} label="Kamar Mandi" shortLabel="K. Mandi" />
              <StatItem icon={Users} value={property.capacity} label="Maks Tamu" shortLabel="Tamu" />
            </div>

            {/* Amenities */}
            {property.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5 md:mt-3">
                {property.amenities.slice(0, 4).map((amenity, i) => (
                  <AmenityItem
                    key={`amenity-${amenity.id || amenity.name}-${i}`}
                    amenity={amenity}
                    variant="badge"
                    showName={false}
                    className="text-[10px] md:text-[11px] py-0 px-1.5 h-5 md:h-6 border-slate-200 text-slate-500"
                  />
                ))}
                {property.amenities.length > 4 && (
                  <span className="inline-flex items-center text-[10px] md:text-[11px] text-slate-500 px-1">
                    +{property.amenities.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* ── Price section ──────────────────────── */}
            <div className="mt-3 md:mt-4 pt-3 border-t border-border">
              <div className="flex items-end justify-between">
                {/* Left: pricing */}
                <div>
                  <span className="text-[11px] text-rose-500 line-through block leading-none">
                    {formatCurrency(inflatedRate)}
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg md:text-xl font-bold text-foreground">
                      {formatCurrency(currentRate)}
                    </span>
                    <span className="text-[11px] md:text-xs text-muted-foreground font-medium">
                      /malam
                    </span>
                  </div>
                </div>

                {/* Right: CTA hint */}
                <span className="text-[11px] md:text-xs text-brand-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 pb-0.5">
                  Lihat →
                </span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

// ─── Stat sub-component ──────────────────────────────────────────────
function StatItem({ icon: Icon, value, label, shortLabel }: { icon: React.ElementType; value: number; label: string; shortLabel: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-muted rounded-md py-1.5 md:py-2"
      title={`${value} ${label}`}
    >
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
        <span className="text-xs md:text-sm font-bold text-foreground">{value}</span>
      </div>
      <span className="text-[8px] md:text-[10px] text-muted-foreground font-medium leading-tight mt-0.5 md:hidden">{shortLabel}</span>
      <span className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5 hidden md:block">{label}</span>
    </div>
  );
}
