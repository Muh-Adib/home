import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface AICalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (data: any) => void;
    loading: boolean;
}

export default function AICalendarModal({ isOpen, onClose, onGenerate, loading }: AICalendarModalProps) {
    const [formData, setFormData] = React.useState({
        keywords: [] as string[],
        target_audience: 'property renters',
        article_count: 10,
        start_date: new Date().toISOString().split('T')[0],
    });
    const [keywordInput, setKeywordInput] = React.useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.keywords.length === 0) {
            alert('Please add at least one keyword');
            return;
        }
        onGenerate(formData);
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
            setFormData({ ...formData, keywords: [...formData.keywords, keywordInput.trim()] });
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setFormData({ ...formData, keywords: formData.keywords.filter(k => k !== keyword) });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <h2 className="text-xl font-bold">Generate Content Calendar</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <p className="text-sm text-gray-600">
                        AI will generate a strategic content calendar based on your keywords and target audience.
                    </p>

                    {/* Keywords */}
                    <div className="space-y-2">
                        <Label htmlFor="keywords">Main Keywords</Label>
                        <div className="flex gap-2">
                            <Input
                                id="keywords"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addKeyword();
                                    }
                                }}
                                placeholder="e.g. villa jogja, homestay murah"
                            />
                            <Button type="button" variant="secondary" onClick={addKeyword}>
                                Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.keywords.map((kw) => (
                                <span key={kw} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-200 flex items-center gap-1">
                                    {kw}
                                    <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-blue-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {formData.keywords.length === 0 && (
                                <p className="text-xs text-gray-400 italic">Add keywords to start</p>
                            )}
                        </div>
                    </div>

                    {/* Audience */}
                    <div className="space-y-2">
                        <Label htmlFor="audience">Target Audience</Label>
                        <Input
                            id="audience"
                            value={formData.target_audience}
                            onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                            placeholder="e.g. travelers, students, digital nomads"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Article Count */}
                        <div className="space-y-2">
                            <Label htmlFor="count">Number of Articles</Label>
                            <Input
                                id="count"
                                type="number"
                                min="1"
                                max="30"
                                value={formData.article_count}
                                onChange={(e) => setFormData({ ...formData, article_count: parseInt(e.target.value) })}
                            />
                        </div>

                        {/* Start Date */}
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Starting From</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={loading || formData.keywords.length === 0}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate Calendar
                                </>
                            )}
                        </Button>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
