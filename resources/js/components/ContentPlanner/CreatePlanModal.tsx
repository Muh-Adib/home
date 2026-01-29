import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    users: { id: number; name: string }[];
    statuses: string[];
    contentTypes: string[];
    initialDate?: string | null;
}

export default function CreatePlanModal({ isOpen, onClose, users, statuses, contentTypes, initialDate }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
        status: 'idea',
        priority: 3,
        content_type: 'article',
        target_audience: '',
        target_keywords: [] as string[],
        planned_publish_date: initialDate || '',
        assigned_to: '',
    });

    const [keywordInput, setKeywordInput] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.content-plans.store'), {
            onSuccess: () => {
                toast.success('Content plan created successfully');
                reset();
                onClose();
            },
            onError: () => {
                toast.error('Failed to create content plan');
            }
        });
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !data.target_keywords.includes(keywordInput.trim())) {
            setData('target_keywords', [...data.target_keywords, keywordInput.trim()]);
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setData('target_keywords', data.target_keywords.filter(k => k !== keyword));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Buat Rencana Konten Baru</DialogTitle>
                    <DialogDescription>
                        Tambahkan rencana konten baru ke kalender editorial Anda.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="title" className="text-xs uppercase font-bold text-gray-500">Judul Konten</Label>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                placeholder="e.g. 10 Tips Memilih Properti"
                                className="border-gray-200"
                            />
                            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description" className="text-xs uppercase font-bold text-gray-500">Deskripsi Singkat</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                placeholder="Apa inti dari konten ini?"
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-xs uppercase font-bold text-gray-500">Status Awal</Label>
                            <Select value={data.status} onValueChange={val => setData('status', val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority" className="text-xs uppercase font-bold text-gray-500">Prioritas (1-5)</Label>
                            <Input
                                type="number"
                                min="1"
                                max="5"
                                value={data.priority}
                                onChange={e => setData('priority', parseInt(e.target.value))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content_type" className="text-xs uppercase font-bold text-gray-500">Tipe Konten</Label>
                            <Select value={data.content_type} onValueChange={val => setData('content_type', val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {contentTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="planned_publish_date" className="text-xs uppercase font-bold text-gray-500">Tanggal Publikasi</Label>
                            <Input
                                type="date"
                                value={data.planned_publish_date}
                                onChange={e => setData('planned_publish_date', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="assigned_to" className="text-xs uppercase font-bold text-gray-500">PIC / Penulis</Label>
                            <Select value={data.assigned_to} onValueChange={val => setData('assigned_to', val)}>
                                <SelectTrigger><SelectValue placeholder="Pilih user..." /></SelectTrigger>
                                <SelectContent>
                                    {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target_audience" className="text-xs uppercase font-bold text-gray-500">Target Audience</Label>
                            <Input
                                value={data.target_audience}
                                onChange={e => setData('target_audience', e.target.value)}
                                placeholder="e.g. Mahasiswa, Keluarga Muda"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <Label className="text-xs uppercase font-bold text-gray-500">Target Keywords</Label>
                        <div className="flex gap-2">
                            <Input
                                value={keywordInput}
                                onChange={e => setKeywordInput(e.target.value)}
                                placeholder="Tambah kata kunci..."
                                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                            />
                            <Button type="button" variant="secondary" size="sm" onClick={addKeyword}>
                                <Plus className="w-4 h-4 mr-1" /> Tambah
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.target_keywords.map(kw => (
                                <Badge key={kw} variant="secondary" className="pl-3 pr-1 py-1 gap-1">
                                    {kw}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="w-4 h-4 rounded-full p-0 h-auto hover:bg-gray-200"
                                        onClick={() => removeKeyword(kw)}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                        <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                            Buat Rencana
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
