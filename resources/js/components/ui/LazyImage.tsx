import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    placeholder?: string;
    priority?: boolean; // Don't lazy load if true (for LCP image)
    fetchPriority?: 'high' | 'low' | 'auto'; // NEW: For LCP optimization
    width?: number | string; // NEW: Explicit width (prevents CLS)
    height?: number | string; // NEW: Explicit height (prevents CLS)
}

export function LazyImage({
    src,
    alt,
    placeholder = '/placeholder.svg',
    priority = false,
    fetchPriority,
    width,
    height,
    className,
    ...props
}: LazyImageProps) {
    const [imageSrc, setImageSrc] = useState(priority ? src : placeholder);
    const [isLoading, setIsLoading] = useState(!priority);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (priority) return; // Skip lazy loading for priority images

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setImageSrc(src);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [src, priority]);

    return (
        <img
            ref={imgRef}
            src={imageSrc}
            alt={alt || 'homsjogja homestay villa jogja'}
            className={cn(
                'transition-opacity duration-300',
                isLoading ? 'opacity-50' : 'opacity-100',
                className
            )}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={fetchPriority} // NEW: Support fetchPriority
            width={width} // NEW: Explicit width
            height={height} // NEW: Explicit height
            onLoad={() => setIsLoading(false)}
            onError={() => {
                setImageSrc(placeholder);
                setIsLoading(false);
            }}
            {...props}
        />
    );
}
