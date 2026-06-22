import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageGallery } from '@/hooks/use-image-gallery';
import { LazyImage } from '@/components/ui/LazyImage';
import { useState } from 'react';

interface PropertyGalleryProps {
    images: Array<{
        id: string | number;
        url: string;
        thumbnail_url?: string;
        alt_text?: string;
        is_featured?: boolean;
    }>;
    currentIndex: number;
    onImageChange: (index: number) => void;
    propertyName: string;
}

export function PropertyGallery({
    images,
    currentIndex,
    onImageChange,
    propertyName
}: PropertyGalleryProps) {
    const {
        currentImage,
        featuredImage,
        hasImages,
        hasMultipleImages,
        nextImage,
        prevImage,
        goToImage,
        thumbnailImages,
        showThumbnailStrip,
        imageCounter
    } = useImageGallery({ images, currentIndex, onImageChange });

    if (!hasImages) {
        return (
            <Card className="overflow-hidden shadow-xl border-0">
                <CardContent className="p-0">
                    <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
                        <div className="text-center">
                            <Building2 className="h-24 w-24 text-primary/60 mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">No images available</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Touch handlers for swipe
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        
        if (isLeftSwipe && hasMultipleImages) {
            nextImage();
        }
        if (isRightSwipe && hasMultipleImages) {
            prevImage();
        }
    };

    return (
        <Card className="overflow-hidden shadow-xl border-0 card-modern">
            <CardContent className="p-0">
                <div 
                    className="relative"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="aspect-[3/4] sm:aspect-[3/4] bg-gradient-to-br from-muted/50 to-background">
                        {currentImage ? (
                            <LazyImage
                                key={currentImage.url}
                                src={currentImage.url}
                                alt={currentImage.alt_text || propertyName}
                                className="w-full h-full object-cover"
                                priority={true}
                                fetchPriority="high"
                                width={1200}
                                height={750}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
                                <Building2 className="h-16 w-16 sm:h-24 sm:w-24 text-primary/60" />
                            </div>
                        )}
                    </div>

                    {/* Navigation Arrows - Mobile Optimized */}
                    {hasMultipleImages && (
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-background/90 hover:bg-background shadow-lg border border-border/50 backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10 p-0"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevImage(); }}
                            >
                                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-background/90 hover:bg-background shadow-lg border border-border/50 backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10 p-0"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextImage(); }}
                            >
                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                            </Button>
                        </>
                    )}

                    {/* Image Counter - Mobile Optimized */}
                    {hasMultipleImages && (
                        <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-background/90 text-foreground px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg border border-border/50 backdrop-blur-sm">
                            {imageCounter}
                        </div>
                    )}
                </div>

                {/* Thumbnail Strip */}
                {showThumbnailStrip && (
                    <div className="p-4">
                        <div className="flex gap-2 overflow-x-auto">
                            {thumbnailImages.map((image, index) => (
                                <button
                                    key={image.id}
                                    onClick={() => goToImage(index)}
                                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                                        ? 'border-blue-500 ring-2 ring-blue-200'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <LazyImage
                                        src={image.thumbnail_url || image.url}
                                        alt={image.alt_text || propertyName}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                            {images.length > 6 && (
                                <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                    +{images.length - 6}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 