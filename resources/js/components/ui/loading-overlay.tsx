import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
    progress?: string;
}

/**
 * Full-screen loading overlay with spinner and progress message
 * Used during long-running AI generation tasks
 */
export function LoadingOverlay({ isLoading, message, progress }: LoadingOverlayProps) {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                        <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-blue-200 animate-pulse" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-lg text-gray-900">
                            {message || 'Processing...'}
                        </h3>
                        {progress && (
                            <p className="text-sm text-gray-600 mt-1 animate-pulse">
                                {progress}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
