import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { type BreadcrumbItem, type PageProps } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    Save,
    Eye,
    Send,
    Calendar,
    Sparkles,
    Image as ImageIcon,
    Link as LinkIcon,
    BarChart,
    Loader2,
    X,
    Upload,
    FileText,
    CheckCircle,
    AlertTriangle,
    Activity,
    Trash2
} from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { useAIGenerator } from '@/hooks/useAIGenerator';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

interface Property {
    id: number;
    name: string;
    slug: string;
}

interface MediaItem {
    id: string;
    url: string;
    thumbnail_url?: string;
    path: string;
    name: string;
    size: number;
    last_modified: number;
    source: 'article' | 'property';
}

interface ArticleEditProps {
    article?: {
        id: number;
        title: string;
        slug: string;
        content: string;
        excerpt?: string;
        meta_title?: string;
        meta_description?: string;
        seo_keywords?: string[];
        target_keywords?: string[];
        status: string;
        language: string;
        scheduled_at?: string;
        featured_image?: string;
        content_plan?: {
            id: number;
            uuid: string;
            ai_outline?: string;
        };
        generation_metadata?: {
            [key: string]: any;
        };
    };
    properties: Property[];
    linkedPropertyIds?: number[];
    languages: string[];
    config: {
        ai_providers: string[];
        default_provider: string;
    };
}

interface ArticleFormData {
    title: string;
    content: string;
    excerpt: string;
    meta_title: string;
    meta_description: string;
    seo_keywords: string[];
    target_keywords: string[];
    status: string;
    language: string;
    scheduled_at: string;
    featured_image: string;
    property_ids: number[];
    outline: string;
    article_type: string;
}

const ARTICLE_TYPES = [
    {
        value: 'travel_guide',
        label: 'Travel Guide',
        description: 'Panduan praktis: lokasi, harga, rekomendasi & CTA booking',
        badge: 'Recommended',
    },
    {
        value: 'seo_article',
        label: 'SEO Article',
        description: 'Artikel mendalam berbasis keyword, FAQ & topical authority',
        badge: null,
    },
    {
        value: 'property_article',
        label: 'Property Feature',
        description: 'Showcase satu properti dengan storytelling & booking CTA',
        badge: null,
    },
    {
        value: 'event_article',
        label: 'Event Article',
        description: 'Artikel timely dipicu event/tren lokal Jogja',
        badge: null,
    },
];

export default function ArticleEdit({ article, properties, linkedPropertyIds = [], languages, config }: ArticleEditProps) {
    const page = usePage<PageProps>();
    const isEdit = !!article;

    const { data, setData, post, put, processing, errors } = useForm<ArticleFormData>({
        title: article?.title || '',
        content: article?.content || '',
        excerpt: article?.excerpt || '',
        meta_title: article?.meta_title || '',
        meta_description: article?.meta_description || '',
        seo_keywords: article?.seo_keywords || [],
        target_keywords: article?.target_keywords || [],
        status: article?.status || 'draft',
        language: article?.language || 'id',
        scheduled_at: article?.scheduled_at || '',
        featured_image: article?.featured_image || '',
        property_ids: linkedPropertyIds,
        outline: article?.content_plan?.ai_outline || '',
        article_type: 'travel_guide',
    });

    const [activeTab, setActiveTab] = useState('editor');
    const [showPreview, setShowPreview] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [keywordInput, setKeywordInput] = useState('');
    const [seoScore, setSeoScore] = useState(0);
    const [generationProgress, setGenerationProgress] = useState('');
    const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [generatedOutline, setGeneratedOutline] = useState('');
    const [showOutlineModal, setShowOutlineModal] = useState(false);
    const [contentTone, setContentTone] = useState<'professional' | 'casual'>('professional');
    const [showMediaExplorer, setShowMediaExplorer] = useState(false);
    const [searchMedia, setSearchMedia] = useState('');
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // AI Generator hooks
    const titleGenerator = useAIGenerator({
        onSuccess: (data) => {
            if (data.titles && data.titles.length > 0) {
                setData('title', data.titles[0]);
            }
        },
    });

    const contentGenerator = useAIGenerator({
        onSuccess: (data) => {
            setData('content', data.content);
        },
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Articles', href: '/admin/articles' },
        { title: isEdit ? 'Edit Article' : 'New Article' },
    ];

    // Calculate SEO score on data changes
    useEffect(() => {
        calculateSEOScore();
    }, [data.title, data.meta_description, data.target_keywords, data.content, data.property_ids, data.featured_image, data.excerpt]);

    // Calculate SEO score
    const calculateSEOScore = useCallback(() => {
        let score = 0;

        // Title (20 points)
        if (data.title && data.title.length >= 30 && data.title.length <= 60) {
            score += 20;
        } else if (data.title) {
            score += 10;
        }

        // Meta description (20 points)
        if (data.meta_description && data.meta_description.length >= 120 && data.meta_description.length <= 160) {
            score += 20;
        } else if (data.meta_description) {
            score += 10;
        }

        // Keywords (15 points)
        if (data.target_keywords.length >= 3) {
            score += 15;
        }

        // Content length (15 points)
        const wordCount = data.content.split(/\s+/).length;
        if (wordCount >= 500) {
            score += 15;
        } else if (wordCount >= 300) {
            score += 10;
        }

        // Properties linked (15 points)
        if (data.property_ids.length > 0) {
            score += 15;
        }

        // Featured image (10 points)
        if (data.featured_image) {
            score += 10;
        }

        // Excerpt (5 points)
        if (data.excerpt) {
            score += 5;
        }

        setSeoScore(score);
    }, [data]);

    // Image upload handler
    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Invalid file type', {
                description: 'Please upload an image file',
            });
            return;
        }

        setUploadingImage(true);
        const loadingToast = toast.loading('Uploading image...', {
            description: 'Converting to WebP format',
        });

        const formData = new FormData();
        formData.append('image', file);
        if (article) {
            formData.append('article_slug', article.slug);
        }

        try {
            const response = await axios.post('/admin/articles/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                const imageUrl = response.data.url;
                const markdown = `![Image](${imageUrl})`;

                // Insert at cursor position
                const textarea = textareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newContent = data.content.substring(0, start) + markdown + data.content.substring(end);
                    setData('content', newContent);
                }

                toast.success('Image uploaded!', {
                    description: `Compressed to WebP (${response.data.compression_ratio}% smaller)`,
                    id: loadingToast,
                });
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Upload failed', {
                description: 'Could not upload image. Please try again.',
                id: loadingToast,
            });
        } finally {
            setUploadingImage(false);
        }
    };

    // Drag & drop handler
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageUpload(files[0]);
        }
    };

    // AI Title generation
    const generateTitles = async () => {
        if (data.target_keywords.length === 0) {
            toast.error('Keywords required', {
                description: 'Please add target keywords first',
            });
            return;
        }

        const loadingToast = toast.loading('Generating titles...', {
            description: 'AI is creating title suggestions for you',
        });

        try {
            const response = await axios.post('/admin/api/articles/ai/generate-title', {
                keywords: data.target_keywords,
                provider: config.default_provider,
                count: 5,
            });

            if (response.data.success && response.data.titles.length > 0) {
                setGeneratedTitles(response.data.titles);
                setShowTitleModal(true);

                toast.success('Titles generated!', {
                    description: `Generated ${response.data.titles.length} title options`,
                    id: loadingToast,
                });
            }
        } catch (error) {
            // Error already handled by backend
            toast.dismiss(loadingToast);
        }
    };

    // Handle title selection from modal
    const handleTitleSelect = (selectedTitle: string) => {
        // Set the title
        setData('title', selectedTitle);

        // Auto-generate SEO title (meta_title) if empty
        if (!data.meta_title) {
            setData('meta_title', selectedTitle.substring(0, 60));
        }

        setShowTitleModal(false);

        toast.success('Title set!', {
            description: 'SEO title also generated automatically',
        });
    };

    // AI Content generation - Step 1: Generate Outline
    const generateContent = async () => {
        if (!data.title) {
            toast.error('Title required', {
                description: 'Please enter a title first',
            });
            return;
        }

        setGenerationProgress('Generating outline...');
        const loadingToast = toast.loading('Creating article outline...', {
            description: 'AI is structuring your content',
        });

        try {
            // If we already have an outline in the form, use that
            if (data.outline) {
                setGeneratedOutline(data.outline);
                setShowOutlineModal(true);
                toast.success('Outline ready!', {
                    description: 'Review the existing outline and choose writing style',
                    id: loadingToast,
                });
                return;
            }

            // Generate outline if none exists
            const outlineResponse = await axios.post('/admin/api/articles/ai/generate-outline', {
                title: data.title,
                keywords: data.target_keywords,
                provider: config.default_provider,
                article_type: data.article_type,
                property_ids: data.property_ids ?? [],
            });

            if (!outlineResponse.data.success) {
                throw new Error(outlineResponse.data.error || 'Failed to generate outline');
            }

            // Set outline and any newly discovered keywords
            const updates: any = { outline: outlineResponse.data.outline };
            if (outlineResponse.data.lsi_keywords && outlineResponse.data.lsi_keywords.length > 0) {
                updates.target_keywords = [...new Set([...data.target_keywords, ...outlineResponse.data.lsi_keywords])];
            }

            setGeneratedOutline(outlineResponse.data.outline);
            setData(prevData => ({ ...prevData, ...updates }));
            setShowOutlineModal(true);

            toast.success('Outline generated!', {
                description: 'Review the outline and choose writing style',
                id: loadingToast,
            });
        } catch (error: any) {
            console.error('Outline generation failed:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Outline generation failed';

            toast.error('Generation failed', {
                description: errorMessage,
                id: loadingToast,
            });
        } finally {
            setGenerationProgress('');
        }
    };

    // Step 2: Generate full content from outline
    const proceedWithContentGeneration = async () => {
        setShowOutlineModal(false);
        setGenerationProgress('Writing article...');

        const loadingToast = toast.loading('Generating content...', {
            description: `Writing in ${contentTone} style`,
        });

        try {
            const contentResponse = await axios.post('/admin/api/articles/ai/generate-content', {
                outline: generatedOutline,
                keywords: data.target_keywords,
                property_ids: data.property_ids,
                language: data.language,
                tone: contentTone,
                provider: config.default_provider,
                article_type: data.article_type,
            });

            if (contentResponse.data.success) {
                const updates: Partial<ArticleFormData> = { content: contentResponse.data.content };

                // Auto-fill excerpt if empty
                if (!data.excerpt && contentResponse.data.excerpt) {
                    updates.excerpt = contentResponse.data.excerpt;
                }

                // Auto-fill meta description if empty
                if (!data.meta_description && contentResponse.data.meta_description) {
                    updates.meta_description = contentResponse.data.meta_description;
                }

                setData(prevData => ({ ...prevData, ...updates }));

                toast.success('Article generated!', {
                    description: `${contentResponse.data.word_count} words + metadata created`,
                    id: loadingToast,
                });
            }
        } catch (error: any) {
            console.error('Content generation failed:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Content generation failed';
            const errorDetails = error.response?.data?.details;

            toast.error('Generation failed', {
                description: errorMessage,
                id: loadingToast,
                action: errorDetails?.suggestion ? {
                    label: 'See suggestion',
                    onClick: () => toast.info('Suggestion', {
                        description: errorDetails.suggestion,
                    }),
                } : undefined,
            });
        } finally {
            setGenerationProgress('');
        }
    };

    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const prevDataRef = useRef(data);

    // Auto-save effect
    useEffect(() => {
        if (!isEdit || !article) return;

        if (JSON.stringify(prevDataRef.current) === JSON.stringify(data)) return;

        const timer = setTimeout(async () => {
            setIsAutoSaving(true);
            try {
                await axios.put(`/admin/articles/${article.slug}`, data, {
                    headers: { 'Accept': 'application/json' }
                });
                setLastSaved(new Date());
                prevDataRef.current = data;
            } catch (error) {
                console.error('Auto-save failed:', error);
            } finally {
                setIsAutoSaving(false);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [data, isEdit, article]);

    // Keyword management
    const addKeyword = () => {
        if (keywordInput.trim() && !data.target_keywords.includes(keywordInput.trim())) {
            setData('target_keywords', [...data.target_keywords, keywordInput.trim()]);
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setData('target_keywords', data.target_keywords.filter(k => k !== keyword));
    };

    // Media Library functions
    const fetchMedia = async (query = '') => {
        setLoadingMedia(true);
        try {
            const response = await axios.get('/admin/articles/media', { params: { search: query } });
            if (response.data.success) {
                setMediaItems(response.data.media);
            }
        } catch (error) {
            console.error('Failed to fetch media:', error);
            toast.error('Failed to load media library');
        } finally {
            setLoadingMedia(false);
        }
    };

    const handleDeleteMedia = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) return;

        const loadingToast = toast.loading('Deleting image...');
        try {
            const response = await axios.delete('/admin/articles/delete-image', { data: { path } });
            if (response.data.success) {
                setMediaItems(mediaItems.filter(item => item.path !== path));
                toast.success('Image deleted', { id: loadingToast });
            } else {
                throw new Error(response.data.message || 'Failed to delete');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete image', { id: loadingToast });
        }
    };

    const insertMediaToEditor = (url: string) => {
        const markdownImage = `\n![Image description](${url})\n`;
        const cursorPosition = textareaRef.current?.selectionStart || data.content.length;
        const newContent = data.content.substring(0, cursorPosition) + markdownImage + data.content.substring(cursorPosition);
        setData('content', newContent);
        setShowMediaExplorer(false);
        toast.success('Image inserted into editor');
    };

    // Article actions
    const handleDeleteArticle = () => {
        if (confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
            router.delete(`/admin/articles/${article?.slug}`);
        }
    };

    // Form submission
    const handleSubmit = (overrideStatus?: string) => {
        if (overrideStatus) {
            setData('status', overrideStatus);
            // Small timeout to ensure state is updated before Inertia grabs it
            setTimeout(() => {
                if (isEdit && article) {
                    put(`/admin/articles/${article.slug}`, { preserveScroll: true });
                } else {
                    post('/admin/articles');
                }
            }, 50);
            return;
        }

        if (isEdit && article) {
            put(`/admin/articles/${article.slug}`, { preserveScroll: true });
        } else {
            post('/admin/articles');
        }
    };



    return (
        <AdminLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Edit Article' : 'New Article'}>
            <div className="space-y-6">
                {/* Header with Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEdit ? 'Edit Article' : 'Create New Article'}
                        </h1>
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                            {lastSaved ? (
                                <span className="flex items-center text-sm text-green-600 font-medium">
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                    Saved {lastSaved.toLocaleTimeString()}
                                </span>
                            ) : (
                                <span className="text-sm text-gray-500">
                                    {isEdit ? `Editing ${article?.title}` : 'Write SEO-optimized content'}
                                </span>
                            )}

                            {data.status === 'scheduled' && (
                                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 ml-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <input
                                        type="datetime-local"
                                        value={data.scheduled_at}
                                        onChange={e => setData('scheduled_at', e.target.value)}
                                        className="h-6 text-xs w-[180px] border-0 bg-transparent p-0 focus:ring-0 shadow-none font-medium text-amber-900 cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {isEdit && (
                            <Button
                                variant="outline"
                                onClick={handleDeleteArticle}
                                className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hidden sm:flex"
                                title="Delete Article"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={() => setShowPreview(!showPreview)}
                            className="bg-white hidden sm:flex"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            {showPreview ? 'Hide' : 'Show'} Preview
                        </Button>

                        <div className="flex-1 md:flex-none flex bg-white rounded-md border shadow-sm items-center h-10">
                            <Select value={data.status} onValueChange={value => setData('status', value)}>
                                <SelectTrigger className="border-0 focus:ring-0 shadow-none h-full w-full md:w-[140px] rounded-r-none text-sm font-medium bg-transparent">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            data.status === 'published' ? 'bg-green-500' :
                                            data.status === 'scheduled' ? 'bg-amber-500' :
                                            data.status === 'reviewing' ? 'bg-blue-500' :
                                            data.status === 'archived' ? 'bg-gray-600' : 'bg-gray-400'
                                        }`} />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="reviewing">In Review</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            <div className="w-[1px] h-6 bg-gray-200" />
                            
                            <Button
                                onClick={() => handleSubmit(data.status)}
                                disabled={processing}
                                variant="ghost"
                                className={`rounded-l-none border-0 h-full hover:bg-gray-50 px-4
                                    ${data.status === 'published' ? 'text-green-600 hover:text-green-700' : 'text-primary hover:text-primary/80'}
                                    font-semibold
                                `}
                            >
                                {processing || isAutoSaving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : data.status === 'published' ? (
                                    <Send className="h-4 w-4 mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                {processing || isAutoSaving ? 'Saving' : data.status === 'published' ? 'Publish' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Editor - 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Article Content</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={e => setData('title', e.target.value)}
                                        placeholder="Enter article title..."
                                        className="text-lg font-medium"
                                    />
                                    {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                                    <p className="text-sm text-gray-500 mt-1">
                                        {data.title.length} characters (optimal: 30-60)
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="excerpt">Excerpt (Optional)</Label>
                                    <Textarea
                                        id="excerpt"
                                        value={data.excerpt}
                                        onChange={e => setData('excerpt', e.target.value)}
                                        placeholder="Brief summary of the article..."
                                        rows={2}
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        {data.excerpt.length} characters
                                    </p>
                                </div>

                                {/* Markdown Editor with Toolbar */}
                                <div>
                                    <Label htmlFor="content">Content (Markdown) *</Label>

                                    {/* ── Google Docs-style Toolbar ── */}
                                    <div className="flex items-center gap-0.5 border border-b-0 rounded-t-md bg-gray-50 px-2 py-1.5 flex-wrap">
                                        {/* Heading buttons */}
                                        {[
                                            { label: 'H2', insert: '\n## ', title: 'Heading 2' },
                                            { label: 'H3', insert: '\n### ', title: 'Heading 3' },
                                        ].map(({ label, insert, title }) => (
                                            <button
                                                key={label}
                                                type="button"
                                                title={title}
                                                className="px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                                onClick={() => {
                                                    const ta = textareaRef.current;
                                                    if (!ta) return;
                                                    const start = ta.selectionStart;
                                                    const newVal = data.content.slice(0, start) + insert + data.content.slice(start);
                                                    setData('content', newVal);
                                                    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + insert.length, start + insert.length); }, 0);
                                                }}
                                            >{label}</button>
                                        ))}

                                        <div className="w-px h-4 bg-gray-300 mx-1" />

                                        {/* Inline formatting */}
                                        {[
                                            { icon: 'B', wrap: '**', title: 'Bold', cls: 'font-extrabold' },
                                            { icon: 'I', wrap: '*', title: 'Italic', cls: 'italic' },
                                        ].map(({ icon, wrap, title, cls }) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                title={title}
                                                className={`px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors ${cls}`}
                                                onClick={() => {
                                                    const ta = textareaRef.current;
                                                    if (!ta) return;
                                                    const start = ta.selectionStart, end = ta.selectionEnd;
                                                    const selected = data.content.slice(start, end) || 'text';
                                                    const replacement = `${wrap}${selected}${wrap}`;
                                                    const newVal = data.content.slice(0, start) + replacement + data.content.slice(end);
                                                    setData('content', newVal);
                                                    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + wrap.length, start + wrap.length + selected.length); }, 0);
                                                }}
                                            >{icon}</button>
                                        ))}

                                        <button
                                            type="button"
                                            title="Blockquote"
                                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                            onClick={() => {
                                                const ta = textareaRef.current;
                                                if (!ta) return;
                                                const start = ta.selectionStart;
                                                const newVal = data.content.slice(0, start) + '\n> ' + data.content.slice(start);
                                                setData('content', newVal);
                                                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 3, start + 3); }, 0);
                                            }}
                                        >"</button>

                                        <button
                                            type="button"
                                            title="Horizontal Rule"
                                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                            onClick={() => {
                                                const ta = textareaRef.current;
                                                if (!ta) return;
                                                const start = ta.selectionStart;
                                                const ins = '\n\n---\n\n';
                                                setData('content', data.content.slice(0, start) + ins + data.content.slice(start));
                                                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + ins.length, start + ins.length); }, 0);
                                            }}
                                        >—</button>

                                        <div className="w-px h-4 bg-gray-300 mx-1" />

                                        {/* Insert Image — triggers Dialog via state */}
                                        <button
                                            type="button"
                                            title="Insert Image"
                                            disabled={uploadingImage}
                                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors disabled:opacity-50"
                                            onClick={() => {
                                                setShowMediaExplorer(true);
                                                fetchMedia(searchMedia);
                                            }}
                                        >
                                            <ImageIcon className="h-3.5 w-3.5" />
                                            Insert Image
                                        </button>

                                        <div className="ml-auto flex items-center gap-2 text-[11px] text-gray-400 select-none pr-1">
                                            <span>Drag & drop ·</span>
                                            <span>{data.content.split(/\s+/).filter(Boolean).length} words</span>
                                        </div>
                                    </div>

                                    {/* ── Textarea ── */}
                                    <div
                                        className="relative"
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        <Textarea
                                            ref={textareaRef}
                                            id="content"
                                            value={data.content}
                                            onChange={e => setData('content', e.target.value)}
                                            placeholder={"Write your article content in Markdown...\n\nTips:\n- Use ## and ### for headings\n- **bold** and *italic*\n- Drag & drop images or click 'Insert Image' above"}
                                            rows={22}
                                            className="font-mono text-sm rounded-t-none border-t-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-400 resize-y"
                                        />
                                        {uploadingImage && (
                                            <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-md">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Uploading...
                                            </div>
                                        )}
                                    </div>
                                    {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content}</p>}

                                    {/* ── Media Explorer Dialog (standalone, state-controlled) ── */}
                                    <Dialog open={showMediaExplorer} onOpenChange={(open) => {
                                        setShowMediaExplorer(open);
                                        if (open) fetchMedia(searchMedia);
                                    }}>
                                        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
                                            <DialogHeader className="p-6 border-b shrink-0 bg-white">
                                                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                                    <ImageIcon className="h-5 w-5 text-primary" />
                                                    Insert Image
                                                </DialogTitle>
                                            </DialogHeader>
                                            <Tabs defaultValue="library" className="flex-1 flex flex-col min-h-0 bg-gray-50/30">
                                                <div className="px-6 pt-4 shrink-0">
                                                    <TabsList className="grid w-[400px] grid-cols-2">
                                                        <TabsTrigger value="library">Library & Properties</TabsTrigger>
                                                        <TabsTrigger value="upload">Upload New Image</TabsTrigger>
                                                    </TabsList>
                                                </div>

                                                {/* Library tab */}
                                                <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden p-6 pt-4 m-0 min-h-0">
                                                    <div className="flex gap-2 mb-4 shrink-0">
                                                        <Input 
                                                            placeholder="Cari gambar properti (e.g. Abaia)..." 
                                                            value={searchMedia} 
                                                            onChange={(e) => setSearchMedia(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && fetchMedia(searchMedia)}
                                                        />
                                                        <Button variant="secondary" onClick={() => fetchMedia(searchMedia)}>
                                                            Cari
                                                        </Button>
                                                    </div>
                                                    
                                                    <div className="flex-1 overflow-y-auto">
                                                    {loadingMedia ? (
                                                        <div className="flex justify-center flex-col items-center h-full text-gray-500">
                                                            <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                                            <p className="font-medium animate-pulse">Loading media library...</p>
                                                        </div>
                                                    ) : mediaItems.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                                            <div className="h-16 w-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
                                                                <ImageIcon className="h-8 w-8" />
                                                            </div>
                                                            <p className="text-lg font-bold text-gray-900 mb-1">No media found</p>
                                                            <p className="text-gray-500">Switch to "Upload" tab to add your first image.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 pb-12">
                                                            {mediaItems.map((item) => (
                                                                <div key={item.id} className="group relative border rounded-lg shadow-sm overflow-hidden bg-white aspect-square flex flex-col hover:shadow-md transition-shadow">
                                                                    <div className="flex-1 relative cursor-pointer bg-gray-100" onClick={() => insertMediaToEditor(item.url)}>
                                                                        <img src={item.thumbnail_url || item.url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                                            <div className="opacity-0 group-hover:opacity-100 bg-white shadow-lg text-black text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 rounded-md transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                                                                                <ImageIcon className="h-3.5 w-3.5" /> Insert
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="px-2 py-1.5 bg-white flex items-center justify-between border-t gap-1">
                                                                        <div className="flex flex-col truncate flex-1 min-w-0">
                                                                            <span className="truncate text-[11px] font-medium text-gray-700" title={item.name}>{item.name}</span>
                                                                            {item.source === 'property' ? (
                                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 self-start mt-0.5 border-blue-200 text-blue-700 bg-blue-50/50 font-semibold rounded-sm">Property</Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 self-start mt-0.5 border-green-200 text-green-700 bg-green-50/50 font-semibold rounded-sm">Article</Badge>
                                                                            )}
                                                                        </div>
                                                                        {item.source === 'article' && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                                                                onClick={(e) => handleDeleteMedia(e, item.path)}
                                                                                title="Delete permanently"
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    </div>
                                                </TabsContent>

                                                {/* Upload tab */}
                                                <TabsContent value="upload" className="flex-1 p-6 m-0 flex items-center justify-center min-h-0">
                                                    <div
                                                        className="w-full max-w-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-blue-50/40 hover:border-blue-400 transition-all cursor-pointer py-16 px-8 text-center shadow-sm"
                                                        onClick={() => document.getElementById('image-upload')?.click()}
                                                    >
                                                        {uploadingImage ? (
                                                            <div className="flex flex-col items-center gap-4">
                                                                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                                                                <p className="text-gray-700 font-semibold">Uploading & converting to WebP...</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-5">
                                                                    <Upload className="h-8 w-8" />
                                                                </div>
                                                                <p className="text-lg font-bold text-gray-900 mb-1">Click to Upload an Image</p>
                                                                <p className="text-sm text-gray-500 mb-1">or drag & drop directly onto the editor</p>
                                                                <p className="text-xs text-gray-400">JPG, PNG, GIF, WEBP · Max 5MB · Auto-converted to WebP</p>
                                                            </>
                                                        )}
                                                        <input
                                                            id="image-upload"
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                                                            }}
                                                        />
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Preview */}
                        {showPreview && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Eye className="h-5 w-5" />
                                        Live Preview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose max-w-none">
                                        <h1>{data.title || 'Untitled Article'}</h1>
                                        {data.excerpt && <p className="lead text-gray-600">{data.excerpt}</p>}
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ children }) => {
                                                    const contentStr = React.Children.toArray(children).reduce((acc, child) => {
                                                        return acc + (typeof child === 'string' ? child : '');
                                                    }, '');
                                                    
                                                    const imageMatch = typeof contentStr === 'string' ? contentStr.match(/^\[IMAGE:\s*(.*?)\]$/is) : null;
                                                    
                                                    if (imageMatch) {
                                                        const desc = imageMatch[1];
                                                        return (
                                                            <div 
                                                                className="my-6 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-100 transition-colors"
                                                                onClick={() => {
                                                                    setSearchMedia(desc.slice(0, 30));
                                                                    setShowMediaExplorer(true);
                                                                    fetchMedia(desc.slice(0, 30));
                                                                }}
                                                            >
                                                                <ImageIcon className="h-8 w-8 text-blue-400 mb-2" />
                                                                <p className="font-semibold text-blue-700 m-0">Image Placeholder</p>
                                                                <p className="text-sm text-blue-600/80 m-0 mt-1 max-w-sm">{desc}</p>
                                                                <Button type="button" size="sm" variant="outline" className="mt-4 bg-white hover:bg-white border-blue-200">
                                                                    Click to Insert Image
                                                                </Button>
                                                            </div>
                                                        );
                                                    }
                                                    return <p>{children}</p>;
                                                }
                                            }}
                                        >
                                            {data.content || '*No content yet...*'}
                                        </ReactMarkdown>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar - 1 column */}
                    <div className="space-y-6">
                        {/* Quality & Completeness Score */}
                        <Card className={seoScore >= 80 ? 'border-green-200 shadow-sm shadow-green-100' : seoScore >= 50 ? 'border-amber-200' : 'border-red-200'}>
                            <CardHeader className={`pb-3 border-b ${seoScore >= 80 ? 'bg-green-50/50' : seoScore >= 50 ? 'bg-amber-50/50' : 'bg-red-50/50'}`}>
                                <CardTitle className="text-sm flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Quality Score
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-lg font-bold ${seoScore >= 80 ? 'text-green-600' : seoScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                            {seoScore}%
                                        </span>
                                        {seoScore >= 80 ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <AlertTriangle className={`h-5 w-5 ${seoScore < 50 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                                        )}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${seoScore >= 80 ? 'bg-green-500' :
                                                seoScore >= 50 ? 'bg-amber-400' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${seoScore}%` }}
                                    />
                                </div>
                                <p className="text-xs font-medium text-gray-700">
                                    {seoScore >= 80 ? '✨ Excellent! Ready to publish.' :
                                        seoScore >= 50 ? '⚠️ Good, but can be improved.' :
                                            '🚨 Needs major improvements.'}
                                </p>

                                <div className="space-y-1.5 pt-2 border-t text-[11px]">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Judul (30-60 char)</span>
                                        <span className={data.title.length >= 30 && data.title.length <= 60 ? 'text-green-600 font-medium' : 'text-red-500'}>{data.title.length >= 30 && data.title.length <= 60 ? '✓' : '✗'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Meta Desc (120-160)</span>
                                        <span className={data.meta_description.length >= 120 && data.meta_description.length <= 160 ? 'text-green-600 font-medium' : 'text-red-500'}>{data.meta_description.length >= 120 && data.meta_description.length <= 160 ? '✓' : '✗'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Featured Image</span>
                                        <span className={data.featured_image ? 'text-green-600 font-medium' : 'text-red-500'}>{data.featured_image ? '✓' : '✗'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Target Keywords (≥3)</span>
                                        <span className={data.target_keywords.length >= 3 ? 'text-green-600 font-medium' : 'text-red-500'}>{data.target_keywords.length >= 3 ? '✓' : '✗'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Linked Properties</span>
                                        <span className={data.property_ids.length > 0 ? 'text-green-600 font-medium' : 'text-red-500'}>{data.property_ids.length > 0 ? '✓' : '✗'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Panjang Konten (≥500)</span>
                                        <span className={data.content.split(/\s+/).length >= 500 ? 'text-green-600 font-medium' : 'text-red-500'}>{data.content.split(/\s+/).length >= 500 ? '✓' : '✗'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Article Outline Tab-like Card */}
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Article Outline
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    value={data.outline}
                                    onChange={(e) => setData('outline', e.target.value)}
                                    placeholder="Add or generate an outline first..."
                                    rows={8}
                                    className="font-mono text-xs"
                                />
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-gray-500">
                                        Single source: synced with Content Planner
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-[10px]"
                                        onClick={generateContent}
                                    >
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        {data.outline ? 'Regenerate' : 'Generate'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Article Type Selector */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Tipe Artikel
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {ARTICLE_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setData('article_type', type.value)}
                                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${data.article_type === type.value
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-xs font-semibold ${data.article_type === type.value ? 'text-primary' : 'text-gray-800'}`}>
                                                {type.label}
                                            </span>
                                            {type.badge && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                                    {type.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-tight">
                                            {type.description}
                                        </p>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* AI Assistance */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    AI Assistance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    size="sm"
                                    onClick={generateTitles}
                                    disabled={titleGenerator.loading || contentGenerator.loading || data.target_keywords.length === 0}
                                >
                                    {titleGenerator.loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate Titles
                                        </>
                                    )}
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    size="sm"
                                    onClick={generateContent}
                                    disabled={titleGenerator.loading || contentGenerator.loading || !data.title}
                                >
                                    {contentGenerator.loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            {generationProgress || 'Generating...'}
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Generate Content
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-gray-500 mt-2">
                                    Powered by {config.default_provider}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Article Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="language">Language</Label>
                                    <Select value={data.language} onValueChange={value => setData('language', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="id">🇮🇩 Indonesia</SelectItem>
                                            <SelectItem value="en">🇬🇧 English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Target Keywords */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Target Keywords</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add keyword..."
                                        value={keywordInput}
                                        onChange={e => setKeywordInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                    />
                                    <Button size="sm" onClick={addKeyword}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {data.target_keywords.map(keyword => (
                                        <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                                            {keyword}
                                            <X
                                                className="h-3 w-3 cursor-pointer hover:text-red-600"
                                                onClick={() => removeKeyword(keyword)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* SEO Meta */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">SEO Meta</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="meta_title">Meta Title</Label>
                                    <Input
                                        id="meta_title"
                                        value={data.meta_title}
                                        onChange={e => setData('meta_title', e.target.value)}
                                        placeholder={data.title || 'SEO title...'}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {data.meta_title.length}/60
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="meta_description">Meta Description</Label>
                                    <Textarea
                                        id="meta_description"
                                        value={data.meta_description}
                                        onChange={e => setData('meta_description', e.target.value)}
                                        placeholder="SEO description..."
                                        rows={3}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {data.meta_description.length}/160
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Featured Image */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Featured Image
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {data.featured_image ? (
                                    <div className="space-y-2">
                                        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                            <img
                                                src={data.featured_image.startsWith('http') ? data.featured_image : `/storage/${data.featured_image}`}
                                                alt="Featured"
                                                className="w-full h-full object-cover"
                                            />
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="absolute top-2 right-2"
                                                onClick={() => setData('featured_image', '')}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-500">Click X to remove</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                            <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-600 mb-2">No featured image</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => document.getElementById('featured-image-upload')?.click()}
                                                disabled={uploadingImage}
                                            >
                                                {uploadingImage ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Upload Image
                                                    </>
                                                )}
                                            </Button>
                                            <input
                                                id="featured-image-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    setUploadingImage(true);
                                                    const loadingToast = toast.loading('Uploading featured image...', {
                                                        description: 'Converting to WebP format',
                                                    });

                                                    const formData = new FormData();
                                                    formData.append('image', file);
                                                    if (article) {
                                                        formData.append('article_slug', article.slug);
                                                    }

                                                    try {
                                                        const response = await axios.post('/admin/articles/upload-image', formData, {
                                                            headers: { 'Content-Type': 'multipart/form-data' },
                                                        });

                                                        if (response.data.success) {
                                                            setData('featured_image', response.data.path);
                                                            toast.success('Featured image uploaded!', {
                                                                description: `Compressed to WebP (${response.data.compression_ratio}% smaller)`,
                                                                id: loadingToast,
                                                            });
                                                        }
                                                    } catch (error) {
                                                        console.error('Upload failed:', error);
                                                        toast.error('Upload failed', {
                                                            description: 'Could not upload image. Please try again.',
                                                            id: loadingToast,
                                                        });
                                                    } finally {
                                                        setUploadingImage(false);
                                                        // Reset input
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">Recommended: 1200x630px (16:9 ratio)</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Property Links */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4" />
                                    Link Properties
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {properties.map(property => (
                                        <label key={property.id} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={data.property_ids.includes(property.id)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setData('property_ids', [...data.property_ids, property.id]);
                                                    } else {
                                                        setData('property_ids', data.property_ids.filter(id => id !== property.id));
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-sm">{property.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {data.property_ids.length} properties linked
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>


            {/* Title Selection Modal */}
            {showTitleModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTitleModal(false)}>
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Select Article Title</h2>
                            <button
                                onClick={() => setShowTitleModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Choose your article title. SEO title will be auto-generated.
                        </p>
                        <div className="space-y-2">
                            {generatedTitles.map((title, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleTitleSelect(title)}
                                    className="w-full text-left p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="flex-shrink-0 mt-1 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm flex items-center justify-center font-medium">
                                            {index + 1}
                                        </span>
                                        <span className="flex-1 font-medium text-gray-900">{title}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Outline Editor Modal */}
            {showOutlineModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowOutlineModal(false)}>
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Review Article Outline</h2>
                            <button onClick={() => setShowOutlineModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Edit the outline and choose your writing style. The AI will use this to generate your article.
                        </p>

                        {/* Tone Selector */}
                        <div className="mb-4">
                            <Label className="mb-2 block font-semibold">Writing Style</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setContentTone('professional')}
                                    className={`p-4 border-2 rounded-lg text-left transition-all ${contentTone === 'professional' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="font-semibold text-gray-900">Professional</div>
                                    <div className="text-sm text-gray-600 mt-1">Business-like and informative</div>
                                </button>
                                <button
                                    onClick={() => setContentTone('casual')}
                                    className={`p-4 border-2 rounded-lg text-left transition-all ${contentTone === 'casual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="font-semibold text-gray-900">Casual</div>
                                    <div className="text-sm text-gray-600 mt-1">Friendly and conversational</div>
                                </button>
                            </div>
                        </div>

                        {/* Outline Editor */}
                        <div className="mb-6">
                            <Label className="mb-2 block font-semibold">Article Outline</Label>
                            <Textarea
                                value={generatedOutline}
                                onChange={(e) => setGeneratedOutline(e.target.value)}
                                rows={15}
                                className="font-mono text-sm"
                                placeholder="Edit your article outline here..."
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                You can edit structure, add/remove sections, or adjust headings
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowOutlineModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={proceedWithContentGeneration} className="bg-blue-600 hover:bg-blue-700">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Article
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay for AI Generation */}
            <LoadingOverlay
                isLoading={titleGenerator.loading || contentGenerator.loading}
                message={titleGenerator.loading ? 'Generating titles...' : 'Generating content...'}
                progress={generationProgress}
            />
        </AdminLayout>
    );
}
