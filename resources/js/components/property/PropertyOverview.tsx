import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, Users, Bed, Bath, Clock, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PropertyWithDetails } from '@/types/property';
import TextFormatMarkdown from '@/components/text-mark-down'

interface PropertyOverviewProps {
  property: PropertyWithDetails;
  formatTime: (time: string) => string;
}

export const PropertyOverview: React.FC<PropertyOverviewProps> = ({ property, formatTime }) => {
  const { t } = useTranslation();

  // Validate and extract TikTok video ID
  const tiktokEmbedUrl = useMemo(() => {
    if (!property.tiktok_video_url) return null;

    // TikTok URL patterns:
    // https://www.tiktok.com/@username/video/1234567890
    // https://vm.tiktok.com/xxxxx/
    // https://tiktok.com/@username/video/1234567890

    const url = property.tiktok_video_url.trim();

    // Validate TikTok URL
    const tiktokPattern = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/(?:@[\w.]+)?\/?video\/(\d+)|(?:https?:\/\/)?(?:vm\.tiktok\.com)\/([\w]+)/i;
    const match = url.match(tiktokPattern);

    if (!match) return null;

    // Extract video ID
    const videoId = match[1] || match[2];
    if (!videoId) return null;

    // Return embed URL
    return `https://www.tiktok.com/embed/v2/${videoId}`;
  }, [property.tiktok_video_url]);

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="h-5 w-5 text-primary" />
            {t('properties.description')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-foreground leading-relaxed text-lg">
            <TextFormatMarkdown text={property.description} />
          </div>
        </CardContent>
      </Card>

      {/* Property Features */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
          <CardTitle className="text-foreground">{t('properties.property_features')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 hover:shadow-md transition-all duration-200">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold text-foreground">{property.capacity}-{property.capacity_max}</p>
              <p className="text-sm text-muted-foreground">{t('booking.guests')}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20 hover:shadow-md transition-all duration-200">
              <Bed className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-semibold text-foreground">{property.bedroom_count}</p>
              <p className="text-sm text-muted-foreground">{t('properties.bedrooms')}</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20 hover:shadow-md transition-all duration-200">
              <Bath className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-semibold text-foreground">{property.bathroom_count}</p>
              <p className="text-sm text-muted-foreground">{t('properties.bathrooms')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TikTok Video Embed */}
      {tiktokEmbedUrl && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Video className="h-5 w-5 text-primary" />
              Video TikTok
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="w-full max-w-md mx-auto">
              <div className="relative w-full" style={{ paddingBottom: '177.78%' }}> {/* 9:16 aspect ratio */}
                <iframe
                  src={tiktokEmbedUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
                  allow="encrypted-media"
                  allowFullScreen
                  title="TikTok Video"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-in Information */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5 text-primary" />
            {t('properties.check_in_information')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <Label className="text-sm font-medium text-muted-foreground">{t('properties.check_in_time')}</Label>
              <p className="text-xl font-semibold text-foreground">{formatTime(property.check_in_time)}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
              <Label className="text-sm font-medium text-muted-foreground">{t('properties.check_out_time')}</Label>
              <p className="text-xl font-semibold text-foreground">{formatTime(property.check_out_time)}</p>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};