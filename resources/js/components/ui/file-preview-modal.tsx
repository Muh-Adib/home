import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    Eye, 
    Download, 
    FileText, 
    Image as ImageIcon, 
    File,
    AlertTriangle,
    Loader2,
    ZoomIn,
    ZoomOut,
    RotateCw
} from 'lucide-react';

interface FilePreviewModalProps {
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileExists?: boolean;
    children?: React.ReactNode;
    className?: string;
}

export function FilePreviewModal({
    filePath,
    fileName,
    fileSize,
    fileType,
    fileExists = true,
    children,
    className = ''
}: FilePreviewModalProps) {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [rotation, setRotation] = useState(0);

    if (!filePath || !fileExists) {
        return (
            <div className="text-center p-4 text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>File tidak ditemukan</p>
            </div>
        );
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown size';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = () => {
        switch (fileType) {
            case 'image':
                return <ImageIcon className="h-5 w-5" />;
            case 'pdf':
                return <FileText className="h-5 w-5" />;
            default:
                return <File className="h-5 w-5" />;
        }
    };

    const getFileTypeColor = () => {
        switch (fileType) {
            case 'image':
                return 'bg-blue-100 text-blue-800';
            case 'pdf':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const handleResetView = () => {
        setZoom(100);
        setRotation(0);
    };

    const renderPreview = () => {
        if (fileType === 'image') {
            return (
                <div className="flex flex-col h-full">
                    {/* Image Controls */}
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleZoomOut}
                                disabled={zoom <= 25}
                            >
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[60px] text-center">
                                {zoom}%
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleZoomIn}
                                disabled={zoom >= 300}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRotate}
                            >
                                <RotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetView}
                            >
                                Reset
                            </Button>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <a href={filePath} download={fileName}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </a>
                        </Button>
                    </div>

                    {/* Image Preview */}
                    <div className="flex-1 overflow-auto p-4 bg-gray-100 relative">
                        <div className="flex items-center justify-center min-h-full">
                            {imageLoading && !imageError && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            )}
                            {imageError ? (
                                <div className="text-center text-gray-500">
                                    <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                                    <p>Gagal memuat gambar</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="mt-2"
                                        onClick={() => {
                                            setImageError(false);
                                            setImageLoading(true);
                                        }}
                                    >
                                        Coba Lagi
                                    </Button>
                                </div>
                            ) : (
                                <img
                                    src={filePath}
                                    alt={fileName || 'Preview'}
                                    className="max-w-none shadow-lg"
                                    style={{
                                        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                                        transition: 'transform 0.3s ease'
                                    }}
                                    onLoad={() => setImageLoading(false)}
                                    onError={() => {
                                        setImageLoading(false);
                                        setImageError(true);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (fileType === 'pdf') {
            return (
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <span className="font-medium">PDF Preview</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <a href={filePath} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Open Full
                                </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <a href={filePath} download={fileName}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </a>
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1">
                        <iframe
                            src={`${filePath}#toolbar=1&navpanes=1&scrollbar=1`}
                            className="w-full h-full border-0"
                            title={fileName || 'PDF Preview'}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center p-8 text-gray-500">
                <File className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Preview tidak tersedia</p>
                <p className="text-sm mb-4">File ini tidak dapat di-preview di browser</p>
                <Button variant="outline" asChild>
                    <a href={filePath} download={fileName}>
                        <Download className="h-4 w-4 mr-2" />
                        Download File
                    </a>
                </Button>
            </div>
        );
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" className={className}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-6xl h-[90vh] p-0">
                <DialogHeader className="p-6 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="flex items-center gap-2">
                                {getFileIcon()}
                                {fileName || 'File Preview'}
                            </DialogTitle>
                            <Badge className={getFileTypeColor()}>
                                {fileType?.toUpperCase() || 'FILE'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            {fileSize && <span>{formatFileSize(fileSize)}</span>}
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    {renderPreview()}
                </div>
            </DialogContent>
        </Dialog>
    );
} 
