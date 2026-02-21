import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    FileText
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
    };
    properties: Property[];
    linkedPropertyIds?: number[];
    languages: string[];
    config: {
        ai_providers: string[];
        default_provider: string;
    };
}

export default function ArticleEdit({ article, properties, linkedPropertyIds = [], languages, config }: ArticleEditProps) {
    const page = usePage<PageProps>();
    const isEdit = !!article;

    const { data, setData, post, put, processing, errors } = useForm({
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
            });

            if (!outlineResponse.data.success) {
                throw new Error(outlineResponse.data.error || 'Failed to generate outline');
            }

            // Show outline for editing
            setGeneratedOutline(outlineResponse.data.outline);
            setData('outline', outlineResponse.data.outline); // Also update form state
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
            });

            if (contentResponse.data.success) {
                // Set content
                setData('content', contentResponse.data.content);

                // Auto-fill excerpt if empty
                if (!data.excerpt && contentResponse.data.excerpt) {
                    setData('excerpt', contentResponse.data.excerpt);
                }

                // Auto-fill meta description if empty
                if (!data.meta_description && contentResponse.data.meta_description) {
                    setData('meta_description', contentResponse.data.meta_description);
                }

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

    // Form submission
    const handleSubmit = (status: string) => {
        setData('status', status);

        if (isEdit && article) {
            put(`/admin/articles/${article.slug}`, {
                preserveScroll: true,
            });
        } else {
            post('/admin/articles');
        }
    };



    return (
        <AdminLayout breadcrumbs={breadcrumbs} title={isEdit ? 'Edit Article' : 'New Article'}>
            <div className="space-y-6">
                {/* Header with Actions */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEdit ? 'Edit Article' : 'Create New Article'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {isEdit ? `Editing ${article?.title}` : 'Write SEO-optimized content with AI assistance'}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowPreview(!showPreview)}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            {showPreview ? 'Hide' : 'Show'} Preview
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSubmit('draft')}
                            disabled={processing}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Draft
                        </Button>
                        <Button
                            onClick={() => handleSubmit('published')}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Publish
                        </Button>
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

                                {/* Markdown Editor */}
                                <div>
                                    <Label htmlFor="content">Content (Markdown) *</Label>
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
                                            placeholder="Write your article content in Markdown...

**Tips:**
- Use ## for headings
- **bold** and *italic*
- Drag & drop images to upload
- Use AI to generate content"
                                            rows={20}
                                            className="font-mono text-sm"
                                        />
                                        {uploadingImage && (
                                            <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Uploading...
                                            </div>
                                        )}
                                    </div>
                                    {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content}</p>}
                                    <p className="text-sm text-gray-500 mt-1">
                                        {data.content.split(/\s+/).length} words
                                    </p>

                                    {/* Image Upload Button */}
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => document.getElementById('image-upload')?.click()}
                                            disabled={uploadingImage}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Image (WebP)
                                        </Button>
                                        <input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                                        />
                                    </div>
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
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {data.content || '*No content yet...*'}
                                        </ReactMarkdown>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar - 1 column */}
                    <div className="space-y-6">
                        {/* SEO Score */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <BarChart className="h-4 w-4" />
                                        SEO Score
                                    </span>
                                    <Badge variant={seoScore >= 70 ? 'default' : seoScore >= 50 ? 'outline' : 'destructive'}>
                                        {seoScore}/100
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all ${seoScore >= 70 ? 'bg-green-600' : seoScore >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                                            }`}
                                        style={{ width: `${seoScore}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    {seoScore >= 70 ? 'Excellent! Ready to publish' :
                                        seoScore >= 50 ? 'Good, but can be improved' :
                                            'Needs improvement'}
                                </p>
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
                                <CardTitle className="text-sm">Settings</CardTitle>
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

                                <div>
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={data.status} onValueChange={value => setData('status', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="reviewing">In Review</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="published">Published</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {data.status === 'scheduled' && (
                                    <div>
                                        <Label htmlFor="scheduled_at">Schedule Date</Label>
                                        <Input
                                            id="scheduled_at"
                                            type="datetime-local"
                                            value={data.scheduled_at}
                                            onChange={e => setData('scheduled_at', e.target.value)}
                                        />
                                    </div>
                                )}
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
