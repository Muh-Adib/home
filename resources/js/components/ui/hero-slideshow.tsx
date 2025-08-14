import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from './button';

interface HeroSlideshowProps {
    images: Array<{
        url: string;
        alt: string;
        title?: string;
    }>;
    autoPlay?: boolean;
    interval?: number;
    showControls?: boolean;
    showIndicators?: boolean;
    className?: string;
}

export default function HeroSlideshow({
    images,
    autoPlay = true,
    interval = 6000,
    showControls = true,
    showIndicators = true,
    className = ''
}: HeroSlideshowProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);

    // Fallback jika tidak ada gambar
    if (!images || images.length === 0) {
        return (
            <div className={`absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${className}`}>
                <div className="absolute inset-0 bg-black/20"></div>
            </div>
        );
    }

    useEffect(() => {
        if (!isPlaying) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, interval);

        return () => clearInterval(timer);
    }, [isPlaying, interval, images.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        // Reset timer when manually changing slides
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 100);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        // Reset timer when manually changing slides
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 100);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
        // Reset timer when manually changing slides
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 100);
    };

    return (
        <div className={`absolute inset-0 overflow-hidden ${className}`}>
            {/* Background Images - Z-index 0 (paling belakang) */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: `url(${images[currentIndex]?.url})`,
                    }}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                >
                    {/* Auto-contrast overlay based on image brightness */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/60"></div>
                    
                    {/* Additional overlay for better text readability */}
                    <div className="absolute inset-0 bg-black/40"></div>
                    
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/50"></div>
                </motion.div>
            </AnimatePresence>

            {/* Floating elements for visual interest - Z-index 1 */}
            <div className="absolute inset-0 pointer-events-none z-[1]">
                <motion.div 
                    className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-blue-100/20 to-indigo-200/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div 
                    className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-indigo-100/15 to-purple-200/15 rounded-full blur-3xl"
                    animate={{
                        scale: [1.1, 1, 1.1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                />
            </div>

            {/* Navigation Arrows - Z-index 10 */}
            {showControls && images.length > 1 && (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevSlide}
                        className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm rounded-full z-[10] border border-white/30"
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextSlide}
                        className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm rounded-full z-[10] border border-white/30"
                        aria-label="Next slide"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </>
            )}

            {/* Bottom Controls - Z-index 10 */}
            {showControls && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-[10]">
                    {/* Play/Pause Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm rounded-full border border-white/30"
                        aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                    >
                        {isPlaying ? (
                            <Pause className="h-4 w-4" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                    </Button>

                    {/* Slide Indicators */}
                    {showIndicators && images.length > 1 && (
                        <div className="flex items-center gap-2">
                            {images.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToSlide(index)}
                                    className={`w-3 h-3 rounded-full transition-all duration-300 border border-white/30 ${
                                        index === currentIndex
                                            ? 'bg-white scale-125'
                                            : 'bg-white/50 hover:bg-white/75'
                                    }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Slide Counter */}
                    <div className="text-white text-sm font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/30">
                        {currentIndex + 1} / {images.length}
                    </div>
                </div>
            )}
        </div>
    );
}
