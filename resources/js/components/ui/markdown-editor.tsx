import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import TextFormatMarkdown from '@/components/text-mark-down';
import { 
    Bold, 
    Italic, 
    Heading1, 
    Heading2, 
    List, 
    Link as LinkIcon, 
    Eye, 
    Edit3, 
    Columns,
    Maximize2
} from 'lucide-react';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    id?: string;
    className?: string;
    error?: string;
}

export function MarkdownEditor({
    value,
    onChange,
    placeholder = 'Tulis konten markdown di sini...',
    rows = 6,
    id,
    className = '',
    error
}: MarkdownEditorProps) {
    const [mode, setMode] = useState<'write' | 'preview' | 'split'>('write');

    const insertMarkdown = (prefix: string, suffix: string = '') => {
        const textarea = document.getElementById(id || 'md-editor') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        
        const replacement = prefix + (selectedText || 'teks') + suffix;
        const newValue = text.substring(0, start) + replacement + text.substring(end);
        
        onChange(newValue);
        
        // Refocus textarea and select new text
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText || 'teks').length);
        }, 50);
    };

    return (
        <div className={`border rounded-2xl overflow-hidden shadow-sm bg-white ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} ${className}`}>
            {/* Toolbar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 border-b border-slate-100">
                {/* Formatting Tools */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                        onClick={() => insertMarkdown('**', '**')}
                        title="Tebal (Bold)"
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                        onClick={() => insertMarkdown('*', '*')}
                        title="Miring (Italic)"
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                        onClick={() => insertMarkdown('# ')}
                        title="Judul 1"
                    >
                        <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                        onClick={() => insertMarkdown('## ')}
                        title="Judul 2"
                    >
                        <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                        onClick={() => insertMarkdown('- ')}
                        title="Daftar Poin"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                        onClick={() => insertMarkdown('[', '](url)')}
                        title="Tautan (Link)"
                    >
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center bg-slate-200/50 p-0.5 rounded-xl self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setMode('write')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            mode === 'write'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Tulis</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('preview')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            mode === 'preview'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Pratinjau</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('split')}
                        className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            mode === 'split'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Columns className="h-3.5 w-3.5" />
                        <span>Split</span>
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="bg-white">
                {mode === 'write' && (
                    <Textarea
                        id={id || 'md-editor'}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        rows={rows}
                        className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4 font-mono text-sm leading-relaxed"
                    />
                )}

                {mode === 'preview' && (
                    <div className="p-4 min-h-[150px] bg-slate-50/50 prose prose-sm max-w-none overflow-y-auto">
                        {value ? (
                            <TextFormatMarkdown text={value} />
                        ) : (
                            <p className="text-slate-400 italic text-sm">Tidak ada pratinjau konten.</p>
                        )}
                    </div>
                )}

                {mode === 'split' && (
                    <div className="grid grid-cols-2 divide-x divide-slate-100 min-h-[220px]">
                        <Textarea
                            id={id || 'md-editor'}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            rows={rows}
                            className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4 font-mono text-sm leading-relaxed resize-none"
                        />
                        <div className="p-4 bg-slate-50/50 prose prose-sm max-w-none overflow-y-auto max-h-[400px]">
                            {value ? (
                                <TextFormatMarkdown text={value} />
                            ) : (
                                <p className="text-slate-400 italic text-sm">Pratinjau kosong...</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
