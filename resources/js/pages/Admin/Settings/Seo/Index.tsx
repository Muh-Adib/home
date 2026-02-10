import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface SeoPage {
    id: number;
    slug: string;
    target_keyword: string;
    title: string;
    filters: any;
    intro_text: string | null;
    is_active: boolean;
    views_count: number;
    created_at: string;
}

interface Props {
    pages: {
        data: SeoPage[];
        links: any[];
    };
}

export default function SeoSettingsIndex({ pages }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<SeoPage | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        slug: '',
        target_keyword: '',
        title: '',
        filters: {} as any,
        intro_text: '',
        is_active: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingPage) {
            put(route('admin.seo-pages.update', editingPage.id), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setEditingPage(null);
                    reset();
                    toast.success('Page updated successfully');
                },
            });
        } else {
            post(route('admin.seo-pages.store'), {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    reset();
                    toast.success('Page created successfully');
                },
            });
        }
    };

    const handleEdit = (page: SeoPage) => {
        setEditingPage(page);
        setData({
            slug: page.slug,
            target_keyword: page.target_keyword,
            title: page.title,
            filters: page.filters || {},
            intro_text: page.intro_text || '',
            is_active: page.is_active,
        });
        setIsCreateOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this page?')) {
            destroy(route('admin.seo-pages.destroy', id), {
                onSuccess: () => toast.success('Page deleted successfully'),
            });
        }
    };

    const openCreate = () => {
        setEditingPage(null);
        reset();
        setIsCreateOpen(true);
    };

    return (
        <AdminLayout>
            <Head title="Programmatic SEO Management" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Programmatic SEO Pages</h1>
                        <p className="text-muted-foreground">Manage dynamic landing pages for SEO keywords.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Page
                    </Button>
                </div>

                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Target Keyword</TableHead>
                                <TableHead>Slug / Title</TableHead>
                                <TableHead>Stats</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pages.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No SEO pages found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pages.data.map((page) => (
                                    <TableRow key={page.id}>
                                        <TableCell className="font-medium">
                                            {page.target_keyword}
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Filters: {JSON.stringify(page.filters)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[300px] truncate" title={page.title}>{page.title}</div>
                                            <a
                                                href={`/s/${page.slug}`}
                                                target="_blank"
                                                className="flex items-center text-xs text-blue-600 hover:underline mt-1"
                                            >
                                                /s/{page.slug} <ExternalLink className="h-3 w-3 ml-1" />
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">{page.views_count} views</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={page.is_active ? 'default' : 'destructive'}>
                                                {page.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(page)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(page.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingPage ? 'Edit SEO Page' : 'Create New SEO Page'}</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="target_keyword">Target Keyword</Label>
                                    <Input
                                        id="target_keyword"
                                        value={data.target_keyword}
                                        onChange={(e) => setData('target_keyword', e.target.value)}
                                        placeholder="e.g. Homestay Murah Jogja"
                                        required
                                    />
                                    {errors.target_keyword && <p className="text-sm text-red-500">{errors.target_keyword}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="slug">Slug (URL)</Label>
                                    <Input
                                        id="slug"
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value)}
                                        placeholder="homestay-murah-jogja"
                                        required
                                    />
                                    {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">Page Title (H1 & Meta Title)</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="Homestay Murah di Jogja - Mulai 100rb"
                                    required
                                />
                                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Filters (JSON Configuration)</Label>
                                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-slate-50">
                                    <div>
                                        <Label className="text-xs">Location</Label>
                                        <Input
                                            value={data.filters.location || ''}
                                            onChange={(e) => setData('filters', { ...data.filters, location: e.target.value })}
                                            placeholder="e.g. Malioboro"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Max Price</Label>
                                        <Input
                                            type="number"
                                            value={data.filters.max_price || ''}
                                            onChange={(e) => setData('filters', { ...data.filters, max_price: e.target.value })}
                                            placeholder="e.g. 500000"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Property Type</Label>
                                        <Input
                                            value={data.filters.property_type || ''}
                                            onChange={(e) => setData('filters', { ...data.filters, property_type: e.target.value })}
                                            placeholder="e.g. homestay / villa"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Amenity</Label>
                                        <Input
                                            value={data.filters.amenity || ''}
                                            onChange={(e) => setData('filters', { ...data.filters, amenity: e.target.value })}
                                            placeholder="e.g. Kolam Renang"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">These filters determine which properties appear on the landing page.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="intro_text">Intro Text (Optional Override)</Label>
                                <Textarea
                                    id="intro_text"
                                    value={data.intro_text}
                                    onChange={(e) => setData('intro_text', e.target.value)}
                                    placeholder="Custom intro text to replace the auto-generated one..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked)}
                                />
                                <Label htmlFor="is_active">Active (Visible to Public)</Label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {editingPage ? 'Update Page' : 'Create Page'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
