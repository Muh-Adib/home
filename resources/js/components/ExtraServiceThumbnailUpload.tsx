import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ImageIcon, X, Upload } from 'lucide-react';

interface ExtraServiceThumbnailUploadProps {
    thumbnailUrl?: string | null;
    onFileChange: (file: File | null) => void;
    error?: string;
}

export default function ExtraServiceThumbnailUpload({
    thumbnailUrl,
    onFileChange,
    error,
}: ExtraServiceThumbnailUploadProps) {
    const [preview, setPreview] = useState<string | null>(thumbnailUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('File harus berupa gambar');
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('Ukuran file maksimal 2MB');
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            onFileChange(file);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onFileChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-2">
            <Label>Thumbnail</Label>
            <div className="space-y-4">
                {/* Preview */}
                {preview && (
                    <div className="relative w-48 h-32 border rounded-lg overflow-hidden">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={handleRemove}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Upload Area */}
                {!preview && (
                    <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={handleButtonClick}
                    >
                        <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 mb-1">
                            Klik untuk upload thumbnail
                        </p>
                        <p className="text-xs text-gray-500">
                            JPG, PNG, WEBP (maks. 2MB)
                        </p>
                    </div>
                )}

                {/* Upload Button (if preview exists, show change button) */}
                {preview && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleButtonClick}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Ganti Thumbnail
                    </Button>
                )}

                {/* Hidden File Input */}
                <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}
            </div>
        </div>
    );
}

