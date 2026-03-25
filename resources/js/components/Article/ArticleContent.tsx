import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

interface ImageData {
    src: string;
    alt: string;
}

// ─── Single Image ────────────────────────────────────────────────────────────
function SingleImage({ src, alt }: ImageData) {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <>
            <figure className="my-8 group">
                <div
                    className="relative overflow-hidden rounded-xl cursor-zoom-in shadow-md hover:shadow-xl transition-shadow duration-300"
                    onClick={() => setIsLightboxOpen(true)}
                >
                    <img
                        src={src}
                        alt={alt}
                        onLoad={() => setIsLoaded(true)}
                        className={`w-full object-cover transition-all duration-500 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                            } group-hover:scale-[1.02]`}
                        style={{ maxHeight: '520px' }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg">
                            <ZoomIn className="w-5 h-5 text-gray-700" />
                        </div>
                    </div>
                </div>
                {alt && (
                    <figcaption className="mt-3 text-center text-sm text-gray-500 italic">
                        {alt}
                    </figcaption>
                )}
            </figure>

            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setIsLightboxOpen(false)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {alt && (
                        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm italic bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm">
                            {alt}
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

// ─── Image Slideshow ─────────────────────────────────────────────────────────
function ImageSlideshow({ images }: { images: ImageData[] }) {
    const [current, setCurrent] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const goTo = (index: number, dir: 'left' | 'right' = 'right') => {
        if (isAnimating) return;
        setDirection(dir);
        setIsAnimating(true);
        setTimeout(() => {
            setCurrent(index);
            setIsAnimating(false);
        }, 300);
    };

    const prev = () => goTo(current === 0 ? images.length - 1 : current - 1, 'left');
    const next = () => goTo(current === images.length - 1 ? 0 : current + 1, 'right');

    useEffect(() => {
        intervalRef.current = setInterval(next, 4500);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [current]);

    return (
        <>
            <figure className="my-8">
                <div className="relative overflow-hidden rounded-xl shadow-md group bg-gray-100">
                    <div
                        className="relative cursor-zoom-in"
                        style={{ height: '420px' }}
                        onClick={() => {
                            setLightboxIndex(current);
                            setIsLightboxOpen(true);
                        }}
                    >
                        <img
                            key={current}
                            src={images[current].src}
                            alt={images[current].alt}
                            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${isAnimating
                                    ? direction === 'right'
                                        ? 'opacity-0 translate-x-4'
                                        : 'opacity-0 -translate-x-4'
                                    : 'opacity-100 translate-x-0'
                                }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow">
                            <ZoomIn className="w-4 h-4 text-gray-700" />
                        </div>

                        {images[current].alt && (
                            <div className="absolute bottom-0 left-0 right-0 px-5 py-4">
                                <p className="text-white text-sm font-medium drop-shadow-md">
                                    {images[current].alt}
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            prev();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-gray-800 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            next();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-gray-800 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
                        {images.map((img, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i, i > current ? 'right' : 'left')}
                                className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all duration-200 ${i === current
                                        ? 'border-blue-500 shadow-md scale-105'
                                        : 'border-transparent opacity-60 hover:opacity-90'
                                    }`}
                            >
                                <img
                                    src={img.src}
                                    alt={img.alt}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 font-medium tabular-nums">
                        {current + 1} / {images.length}
                    </span>
                </div>
            </figure>

            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setIsLightboxOpen(false)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-colors z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex((i) => (i === 0 ? images.length - 1 : i - 1));
                        }}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <img
                        src={images[lightboxIndex].src}
                        alt={images[lightboxIndex].alt}
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-colors z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex((i) => (i === images.length - 1 ? 0 : i + 1));
                        }}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 text-sm bg-black/40 px-4 py-1.5 rounded-full">
                        {lightboxIndex + 1} / {images.length}
                        {images[lightboxIndex].alt && ` · ${images[lightboxIndex].alt}`}
                    </p>
                </div>
            )}
        </>
    );
}

// ─── Smart Paragraph Renderer ────────────────────────────────────────────────
function SmartParagraph({ children }: { children?: React.ReactNode }) {
    const childArray = React.Children.toArray(children);

    const meaningful = childArray.filter((child) => {
        if (typeof child === 'string') return child.trim() !== '';
        return true;
    });

    const allImages = meaningful.length > 0 && meaningful.every((child) => {
        return React.isValidElement(child) && child.type === 'img';
    });

    if (allImages) {
        const images: ImageData[] = meaningful.map((child) => {
            const el = child as React.ReactElement<{ src?: string; alt?: string }>;
            return {
                src: el.props.src || '',
                alt: el.props.alt || '',
            };
        });

        if (images.length === 1) {
            return <SingleImage src={images[0].src} alt={images[0].alt} />;
        }
        return <ImageSlideshow images={images} />;
    }

    return <p className="text-gray-700 leading-relaxed mb-4">{children}</p>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ArticleContentProps {
    content: string;
}

export function ArticleContent({ content }: ArticleContentProps) {
    return (
        <Card>
            <CardContent className="pt-8">
                <article className="prose prose-lg max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            img: ({ src, alt }) => (
                                <SingleImage src={src || ''} alt={alt || ''} />
                            ),
                            p: ({ children }) => <SmartParagraph>{children}</SmartParagraph>,
                            h1: ({ children }) => (
                                <h1 className="text-3xl font-bold text-gray-900 mt-10 mb-4 leading-tight tracking-tight">
                                    {children}
                                </h1>
                            ),
                            h2: ({ children }) => (
                                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3 leading-snug">
                                    {children}
                                </h2>
                            ),
                            h3: ({ children }) => (
                                <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">
                                    {children}
                                </h3>
                            ),
                            a: ({ href, children }) => (
                                <a
                                    href={href}
                                    className="text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {children}
                                </a>
                            ),
                            ul: ({ children }) => (
                                <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
                            ),
                            ol: ({ children }) => (
                                <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
                            ),
                            li: ({ children }) => (
                                <li className="text-gray-700 leading-relaxed">{children}</li>
                            ),
                            blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-blue-400 pl-5 py-1 italic text-gray-600 my-5 bg-blue-50/50 rounded-r-lg">
                                    {children}
                                </blockquote>
                            ),
                            hr: () => <hr className="my-8 border-gray-200" />,
                            code: ({ className, children }) => {
                                const isInline = !className;
                                return isInline ? (
                                    <code className="bg-gray-100 text-pink-600 text-[0.85em] px-1.5 py-0.5 rounded font-mono">
                                        {children}
                                    </code>
                                ) : (
                                    <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4">
                                        {children}
                                    </code>
                                );
                            },
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </article>
            </CardContent>
        </Card>
    );
}
