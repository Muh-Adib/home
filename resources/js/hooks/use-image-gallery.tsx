import { useCallback, useMemo } from 'react';

export interface ImageGalleryHookProps {
    images: Array<{
        id: string | number;
        url: string;
        thumbnail_url?: string;
        alt_text?: string;
        is_featured?: boolean;
    }>;
    currentIndex: number;
    onImageChange: (index: number) => void;
}

export interface ImageGalleryHookReturn {
    currentImage: any;
    featuredImage: any;
    hasImages: boolean;
    hasMultipleImages: boolean;
    nextImage: () => void;
    prevImage: () => void;
    goToImage: (index: number) => void;
    thumbnailImages: any[];
    showThumbnailStrip: boolean;
    imageCounter: string;
}

export function useImageGallery({ 
    images, 
    currentIndex, 
    onImageChange 
}: ImageGalleryHookProps): ImageGalleryHookReturn {
    
    // Computed values
    const hasImages = useMemo(() => images.length > 0, [images.length]);
    const hasMultipleImages = useMemo(() => images.length > 1, [images.length]);
    
    const currentImage = useMemo(() => {
        return images[currentIndex] || null;
    }, [images, currentIndex]);
    
    const featuredImage = useMemo(() => {
        return images.find(img => img.is_featured) || images[0] || null;
    }, [images]);
    
    const thumbnailImages = useMemo(() => {
        return images.slice(0, 6); // Show max 6 thumbnails
    }, [images]);
    
    const showThumbnailStrip = useMemo(() => {
        return hasMultipleImages && images.length > 1;
    }, [hasMultipleImages, images.length]);
    
    const imageCounter = useMemo(() => {
        return `${currentIndex + 1} / ${images.length}`;
    }, [currentIndex, images.length]);
    
    // Navigation functions
    const nextImage = useCallback(() => {
        const nextIndex = (currentIndex + 1) % images.length;
        onImageChange(nextIndex);
    }, [currentIndex, images.length, onImageChange]);
    
    const prevImage = useCallback(() => {
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        onImageChange(prevIndex);
    }, [currentIndex, images.length, onImageChange]);
    
    const goToImage = useCallback((index: number) => {
        if (index >= 0 && index < images.length) {
            onImageChange(index);
        }
    }, [images.length, onImageChange]);
    
    return {
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
    };
} 