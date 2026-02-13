import React, { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Plus, Pencil, Trash2, ExternalLink, Search, HeartPulse,
    CheckCircle2, XCircle, Loader2, Eye, BarChart3, Globe, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────
interface SeoPage {
    id: number;
    slug: string;
    title: string;
    h1: string;
    meta_description: string;
    filters: Record<string, string> | string | null;
    target_keyword: string;
    search_volume: number;
    sitemap_priority: number;
    sitemap_changefreq: string;
    intro_text: string | null;
    is_active: boolean;
    indexed_at: string | null;
    views_count: number;
    url: string;
    created_at: string;
    updated_at: string;
}

interface PaginationLink { url: string | null; label: string; active: boolean; }

interface Props {
    pages: {
        data: SeoPage[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: { search: string; status: string };
}

// ─── Form Data ───────────────────────────────────────────────────────
interface FormData {
    slug: string;
    target_keyword: string;
    title: string;
    h1: string;
    meta_description: string;
    filters: Record<string, string>;
    search_volume: number;
    sitemap_priority: number;
    sitemap_changefreq: string;
    intro_text: string;
    is_active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

function parseFilters(f: Record<string, string> | string | null | undefined): Record<string, string> {
    if (!f) return {};
    if (typeof f === 'object') return f;
    try { let p = JSON.parse(f); if (typeof p === 'string') p = JSON.parse(p); return typeof p === 'object' && p !== null ? p : {}; } catch { return {}; }
}

const defaults: FormData = {
    slug: '', target_keyword: '', title: '', h1: '', meta_description: '',
    filters: {}, search_volume: 0, sitemap_priority: 0.7, sitemap_changefreq: 'weekly',
    intro_text: '', is_active: true,
};

// ─── Component ───────────────────────────────────────────────────────
export default function SeoSettingsIndex({ pages, filters: pageFilters }: Props) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<SeoPage | null>(null);
    const [previewPage, setPreviewPage] = useState<SeoPage | null>(null);
    const [searchValue, setSearchValue] = useState(pageFilters.search || '');
    const [healthStatus, setHealthStatus] = useState<Record<number, { ok: boolean; status: number; loading: boolean }>>({});

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm<FormData>({ ...defaults });

    // ── Search debounce ──────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => {
            if (searchValue !== pageFilters.search) {
                router.get(route('admin.seo-pages.index'), {
                    search: searchValue || undefined,
                    status: pageFilters.status !== 'all' ? pageFilters.status : undefined,
                }, { preserveState: true, replace: true });
            }
        }, 400);
        return () => clearTimeout(t);
    }, [searchValue]);

    const handleStatusFilter = (status: string) => {
        router.get(route('admin.seo-pages.index'), {
            search: pageFilters.search || undefined,
            status: status !== 'all' ? status : undefined,
        }, { preserveState: true, replace: true });
    };

    // ── Keyword → slug auto-fill ─────────────────────────────────────
    const handleKeywordChange = (value: string) => {
        if (!editingPage) {
            setData(prev => ({ ...prev, target_keyword: value, slug: slugify(value) }));
        } else {
            setData('target_keyword', value);
        }
    };

    // ── CRUD ─────────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = {
            onSuccess: () => { setIsFormOpen(false); setEditingPage(null); reset(); toast.success(editingPage ? 'Page updated' : 'Page created'); },
        };
        editingPage ? put(route('admin.seo-pages.update', editingPage.id), opts) : post(route('admin.seo-pages.store'), opts);
    };

    const handleEdit = (page: SeoPage) => {
        setEditingPage(page);
        setData({
            slug: page.slug,
            target_keyword: page.target_keyword,
            title: page.title,
            h1: page.h1 || '',
            meta_description: page.meta_description || '',
            filters: parseFilters(page.filters),
            search_volume: page.search_volume || 0,
            sitemap_priority: page.sitemap_priority ?? 0.7,
            sitemap_changefreq: page.sitemap_changefreq || 'weekly',
            intro_text: page.intro_text || '',
            is_active: page.is_active,
        });
        setIsFormOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm('Delete this page?')) destroy(route('admin.seo-pages.destroy', id), { onSuccess: () => toast.success('Deleted') });
    };

    const openCreate = () => { setEditingPage(null); reset(); setIsFormOpen(true); };

    // ── Health check ─────────────────────────────────────────────────
    const checkHealth = async (page: SeoPage) => {
        setHealthStatus(p => ({ ...p, [page.id]: { ok: false, status: 0, loading: true } }));
        try {
            const r = await fetch(route('admin.seo-pages.check-health', page.id));
            const j = await r.json();
            setHealthStatus(p => ({ ...p, [page.id]: { ok: j.ok, status: j.status, loading: false } }));
        } catch {
            setHealthStatus(p => ({ ...p, [page.id]: { ok: false, status: 0, loading: false } }));
        }
    };
    const checkAllHealth = async () => { for (const p of pages.data) await checkHealth(p); };
    const handlePagination = (url: string | null) => { if (url) router.get(url, {}, { preserveState: true }); };

    // ── Render ────────────────────────────────────────────────────────
    return (
        <AdminLayout>
            <Head title="Programmatic SEO" />

            <div className="space-y-6">
                {/* ═══ Header ═══════════════════════════════════════════ */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Globe className="h-6 w-6 text-blue-600" />
                            Programmatic SEO Pages
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Kelola landing page dinamis untuk target keyword SEO.
                            <Badge variant="secondary" className="ml-2 text-xs">{pages.total} halaman</Badge>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={checkAllHealth}>
                            <HeartPulse className="mr-1.5 h-4 w-4" />Check All
                        </Button>
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="mr-1.5 h-4 w-4" />Buat Halaman
                        </Button>
                    </div>
                </div>

                {/* ═══ Filters ══════════════════════════════════════════ */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Cari keyword, slug, atau judul..." value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)} className="pl-9 h-9" />
                    </div>
                    <Select value={pageFilters.status || 'all'} onValueChange={handleStatusFilter}>
                        <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua</SelectItem>
                            <SelectItem value="active">Aktif</SelectItem>
                            <SelectItem value="inactive">Nonaktif</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* ═══ Table ════════════════════════════════════════════ */}
                <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80">
                                <TableHead className="w-[240px] font-semibold">Target Keyword</TableHead>
                                <TableHead className="font-semibold">Title & URL</TableHead>
                                <TableHead className="w-[110px] font-semibold text-center">Views</TableHead>
                                <TableHead className="w-[90px] font-semibold text-center">Status</TableHead>
                                <TableHead className="w-[70px] font-semibold text-center">Health</TableHead>
                                <TableHead className="w-[110px] font-semibold text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pages.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <Globe className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                                        <p className="font-medium">{pageFilters.search ? 'Tidak ditemukan' : 'Belum ada halaman SEO'}</p>
                                        <p className="text-sm mt-1">Klik "Buat Halaman" untuk mulai</p>
                                    </TableCell>
                                </TableRow>
                            ) : pages.data.map((page) => {
                                const fl = parseFilters(page.filters);
                                const hs = healthStatus[page.id];
                                return (
                                    <TableRow key={page.id} className="group hover:bg-blue-50/30 transition-colors">
                                        {/* Keyword + Filters */}
                                        <TableCell>
                                            <span className="font-semibold text-slate-800">{page.target_keyword}</span>
                                            {Object.keys(fl).length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {Object.entries(fl).map(([k, v]) => v ? (
                                                        <Badge key={k} variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-slate-50">
                                                            {k}: {v}
                                                        </Badge>
                                                    ) : null)}
                                                </div>
                                            )}
                                            {page.search_volume > 0 && (
                                                <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600">
                                                    <BarChart3 className="h-3 w-3" />{page.search_volume} vol/mo
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* Title + URL */}
                                        <TableCell>
                                            <div className="max-w-[320px] truncate font-medium text-sm" title={page.title}>{page.title}</div>
                                            {page.h1 && page.h1 !== page.title && (
                                                <div className="text-xs text-muted-foreground truncate max-w-[320px]">H1: {page.h1}</div>
                                            )}
                                            <a href={page.url || `/s/${page.slug}`} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center text-xs text-blue-600 hover:underline mt-0.5 gap-0.5">
                                                /s/{page.slug} <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </TableCell>

                                        {/* Views */}
                                        <TableCell className="text-center">
                                            <span className="text-sm font-medium text-slate-700">{page.views_count.toLocaleString()}</span>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="text-center">
                                            <Badge variant={page.is_active ? 'default' : 'destructive'} className="text-[11px]">
                                                {page.is_active ? 'Aktif' : 'Off'}
                                            </Badge>
                                        </TableCell>

                                        {/* Health */}
                                        <TableCell className="text-center">
                                            {hs ? (
                                                hs.loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" /> :
                                                    hs.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> :
                                                        <span className="flex items-center gap-0.5 justify-center text-red-500 text-xs font-medium"><XCircle className="h-4 w-4" />{hs.status || 'Err'}</span>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-7 w-7 mx-auto" onClick={() => checkHealth(page)}>
                                                    <HeartPulse className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            )}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewPage(page)} title="Preview">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(page)} title="Edit">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(page.id)} title="Hapus">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* ═══ Pagination ═══════════════════════════════════════ */}
                {pages.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Menampilkan {pages.from}–{pages.to} dari {pages.total}</p>
                        <div className="flex gap-1">
                            {pages.links.map((link, i) => (
                                <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm" disabled={!link.url}
                                    onClick={() => handlePagination(link.url)} className="min-w-[36px] h-8"
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    PREVIEW DIALOG
                   ═══════════════════════════════════════════════════════ */}
                <Dialog open={!!previewPage} onOpenChange={(o) => !o && setPreviewPage(null)}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        {previewPage && (() => {
                            const pf = parseFilters(previewPage.filters);
                            return (
                                <>
                                    <DialogHeader>
                                        <DialogTitle className="text-lg flex items-center gap-2">
                                            <Eye className="h-5 w-5 text-blue-600" />Preview
                                        </DialogTitle>
                                    </DialogHeader>

                                    <div className="space-y-5 mt-2">
                                        {/* Google SERP Preview */}
                                        <div className="rounded-lg border p-4 bg-white space-y-0.5">
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Google Search Preview</p>
                                            <p className="text-[#1a0dab] text-[18px] font-medium leading-snug truncate hover:underline cursor-default">
                                                {previewPage.title}
                                            </p>
                                            <p className="text-[#006621] text-[13px] truncate">
                                                {previewPage.url || `https://homsjogja.com/s/${previewPage.slug}`}
                                            </p>
                                            <p className="text-[13px] text-[#545454] line-clamp-2 leading-[1.58]">
                                                {previewPage.meta_description || '—'}
                                            </p>
                                        </div>

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <InfoBox label="Target Keyword" value={previewPage.target_keyword} />
                                            <InfoBox label="Slug" value={`/s/${previewPage.slug}`} />
                                            <InfoBox label="H1 Heading" value={previewPage.h1 || '= title'} />
                                            <InfoBox label="Search Volume" value={previewPage.search_volume > 0 ? `${previewPage.search_volume.toLocaleString()} /mo` : '—'} />
                                            <InfoBox label="Sitemap Priority" value={String(previewPage.sitemap_priority)} />
                                            <InfoBox label="Change Freq" value={previewPage.sitemap_changefreq} />
                                            <InfoBox label="Views" value={previewPage.views_count.toLocaleString()} />
                                            <InfoBox label="Status" value={previewPage.is_active ? '✅ Aktif' : '❌ Nonaktif'} />
                                            <InfoBox label="Indexed" value={previewPage.indexed_at ? new Date(previewPage.indexed_at).toLocaleDateString('id-ID') : '—'} />
                                        </div>

                                        {/* Filters */}
                                        {Object.keys(pf).length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-sm font-semibold text-slate-700">Filters</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(pf).map(([k, v]) => (
                                                        <Badge key={k} variant="secondary" className="text-xs px-2.5 py-1">
                                                            <span className="font-semibold">{k}:</span>&nbsp;{v}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Intro text */}
                                        {previewPage.intro_text && (
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-slate-700">Intro Text (Fallback)</p>
                                                <p className="text-sm text-muted-foreground bg-slate-50 rounded-md p-3">{previewPage.intro_text}</p>
                                            </div>
                                        )}

                                        {/* Timestamps */}
                                        <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                                            <span>Dibuat: {new Date(previewPage.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            <span>Diupdate: {new Date(previewPage.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button asChild variant="outline" size="sm">
                                                <a href={previewPage.url || `/s/${previewPage.slug}`} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="mr-1.5 h-4 w-4" />Buka Halaman
                                                </a>
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => { setPreviewPage(null); handleEdit(previewPage); }}>
                                                <Pencil className="mr-1.5 h-4 w-4" />Edit
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </DialogContent>
                </Dialog>

                {/* ═══════════════════════════════════════════════════════
                    CREATE / EDIT DIALOG
                   ═══════════════════════════════════════════════════════ */}
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {editingPage ? <Pencil className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                                {editingPage ? 'Edit Halaman SEO' : 'Buat Halaman SEO Baru'}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                            {/* ── Section: Keyword & URL ─────────────── */}
                            <fieldset className="space-y-3 rounded-lg border p-4">
                                <legend className="text-sm font-semibold text-slate-600 px-1">🎯 Keyword & URL</legend>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Target Keyword *</Label>
                                        <Input value={data.target_keyword} onChange={(e) => handleKeywordChange(e.target.value)}
                                            placeholder="homestay murah jogja" required className="h-9" />
                                        {errors.target_keyword && <p className="text-xs text-red-500">{errors.target_keyword}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Slug (URL) *</Label>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground shrink-0">/s/</span>
                                            <Input value={data.slug} onChange={(e) => setData('slug', e.target.value)}
                                                placeholder="homestay-murah-jogja" required className="h-9" />
                                        </div>
                                        {errors.slug && <p className="text-xs text-red-500">{errors.slug}</p>}
                                    </div>
                                </div>
                            </fieldset>

                            {/* ── Section: SEO Meta ──────────────────── */}
                            <fieldset className="space-y-3 rounded-lg border p-4">
                                <legend className="text-sm font-semibold text-slate-600 px-1">📄 Meta SEO</legend>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Page Title (Meta Title) *</Label>
                                    <Input value={data.title} onChange={(e) => setData('title', e.target.value)}
                                        placeholder="Homestay Murah di Jogja - Mulai 100rb/Malam" required className="h-9" />
                                    {data.title && <p className={`text-[10px] text-right ${data.title.length > 60 ? 'text-amber-500' : 'text-muted-foreground'}`}>{data.title.length}/60</p>}
                                    {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">H1 Heading</Label>
                                    <Input value={data.h1} onChange={(e) => setData('h1', e.target.value)}
                                        placeholder="Kosongkan = auto dari title" className="h-9" />
                                    <p className="text-[10px] text-muted-foreground">Heading utama halaman. Kosongkan untuk menggunakan title.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Meta Description</Label>
                                    <Textarea value={data.meta_description} onChange={(e) => setData('meta_description', e.target.value)}
                                        placeholder="Kosongkan = auto-generate. Maks 160 karakter." rows={2} className="text-sm" />
                                    <div className="flex justify-between">
                                        <p className="text-[10px] text-muted-foreground">Kosongkan = auto-generate dari keyword</p>
                                        {data.meta_description && (
                                            <p className={`text-[10px] ${data.meta_description.length > 160 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                                {data.meta_description.length}/160
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </fieldset>

                            {/* ── Section: Filters ───────────────────── */}
                            <fieldset className="space-y-3 rounded-lg border p-4">
                                <legend className="text-sm font-semibold text-slate-600 px-1">🔍 Filter Properti</legend>
                                <p className="text-xs text-muted-foreground -mt-1">Filter menentukan properti mana yang muncul di landing page ini.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px]">Location</Label>
                                        <Input value={data.filters.location || ''} className="h-9"
                                            onChange={(e) => setData('filters', { ...data.filters, location: e.target.value })}
                                            placeholder="Malioboro, Bantul, dll" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px]">Max Price (Rp)</Label>
                                        <Input type="number" value={data.filters.max_price || ''} className="h-9"
                                            onChange={(e) => setData('filters', { ...data.filters, max_price: e.target.value })}
                                            placeholder="500000" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px]">Property Type</Label>
                                        <Select value={data.filters.property_type || ''} onValueChange={(v) => setData('filters', { ...data.filters, property_type: v })}>
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Semua" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="homestay">Homestay</SelectItem>
                                                <SelectItem value="villa">Villa</SelectItem>
                                                <SelectItem value="guest_house">Guest House</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px]">Amenity</Label>
                                        <Input value={data.filters.amenity || ''} className="h-9"
                                            onChange={(e) => setData('filters', { ...data.filters, amenity: e.target.value })}
                                            placeholder="Kolam Renang" />
                                    </div>
                                </div>
                            </fieldset>

                            {/* ── Section: Intro & Settings ──────────── */}
                            <fieldset className="space-y-3 rounded-lg border p-4">
                                <legend className="text-sm font-semibold text-slate-600 px-1">⚙️ Konten & Pengaturan</legend>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Intro Text (Fallback)</Label>
                                    <Textarea value={data.intro_text} onChange={(e) => setData('intro_text', e.target.value)}
                                        placeholder="Paragraf pembuka jika auto-generate gagal..." rows={2} className="text-sm" />
                                    <p className="text-[10px] text-muted-foreground">Digunakan sebagai fallback jika generate konten otomatis gagal.</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Search Volume</Label>
                                        <Input type="number" min={0} value={data.search_volume} className="h-9"
                                            onChange={(e) => setData('search_volume', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Sitemap Priority</Label>
                                        <Select value={String(data.sitemap_priority)} onValueChange={(v) => setData('sitemap_priority', parseFloat(v))}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(v => (
                                                    <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Change Freq</Label>
                                        <Select value={data.sitemap_changefreq} onValueChange={(v) => setData('sitemap_changefreq', v)}>
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map(v => (
                                                    <SelectItem key={v} value={v}>{v}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-1">
                                    <Switch checked={data.is_active} onCheckedChange={(c) => setData('is_active', c)} />
                                    <Label className="text-sm">Aktif (Tampil ke publik & terindex Google)</Label>
                                </div>
                            </fieldset>

                            {/* Read-only info when editing */}
                            {editingPage && (
                                <div className="rounded-lg bg-slate-50 border border-dashed p-3 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                                    <span>Views: <strong className="text-slate-700">{editingPage.views_count}</strong></span>
                                    <span>Indexed: <strong className="text-slate-700">{editingPage.indexed_at ? new Date(editingPage.indexed_at).toLocaleDateString('id-ID') : '—'}</strong></span>
                                    <span>Dibuat: <strong className="text-slate-700">{new Date(editingPage.created_at).toLocaleDateString('id-ID')}</strong></span>
                                    <span>Diupdate: <strong className="text-slate-700">{new Date(editingPage.updated_at).toLocaleDateString('id-ID')}</strong></span>
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>Batal</Button>
                                <Button type="submit" size="sm" disabled={processing}>
                                    {processing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                                    {editingPage ? 'Simpan Perubahan' : 'Buat Halaman'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────
function InfoBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md bg-slate-50 border p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium text-slate-800 mt-0.5 truncate" title={value}>{value}</p>
        </div>
    );
}
