import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageGallery } from '@/hooks/use-image-gallery';

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
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="aspect-[16/10] bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <Building2 className="h-20 w-20 text-blue-400" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="relative">
                    <div className="aspect-[16/10] bg-gray-200">
                        {currentImage ? (
                            <img 
                                src={currentImage.url}
                                alt={currentImage.alt_text || propertyName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                <Building2 className="h-20 w-20 text-blue-400" />
                            </div>
                        )}
                    </div>
                    
                    {/* Navigation Arrows */}
                    {hasMultipleImages && (
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                onClick={prevImage}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                onClick={nextImage}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    
                    {/* Image Counter */}
                    {hasMultipleImages && (
                        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
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
                                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                        index === currentIndex 
                                            ? 'border-blue-500 ring-2 ring-blue-200' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <img 
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