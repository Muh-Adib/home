import { useState } from 'react';
import { apiPost, type ApiError } from '@/lib/api';
import { toast } from 'sonner';

interface UseAIGeneratorOptions {
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    maxRetries?: number;
}

interface AIErrorResponse {
    success: false;
    error: string;
    details?: {
        provider?: string;
        original_error?: string;
        suggestion?: string;
    };
    retry_suggested?: boolean;
}

/**
 * Custom hook for AI content generation with retry logic and toast notifications
 */
export function useAIGenerator(options: UseAIGeneratorOptions = {}) {
    const { onSuccess, onError, maxRetries = 2 } = options;
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');

    const generate = async (
        endpoint: string,
        data: any,
        progressMessage?: string
    ) => {
        setLoading(true);
        let retries = 0;

        const attemptGeneration = async (): Promise<any> => {
            try {
                if (progressMessage) {
                    setProgress(progressMessage);
                }

                const result = await apiPost<{ success: boolean; error?: string } & Record<string, any>>(endpoint, data);

                if (result.success) {
                    onSuccess?.(result);
                    return result;
                } else {
                    throw new Error(result.error || 'Generation failed');
                }
            } catch (error: any) {
                const apiError = error as ApiError;
                const errorData = apiError.data as AIErrorResponse | undefined;

                // Check if we should retry
                if (retries < maxRetries && (errorData as any)?.retry_suggested) {
                    retries++;
                    const delay = Math.pow(2, retries) * 1000; // Exponential backoff

                    toast.loading(`Retrying... (Attempt ${retries}/${maxRetries})`, {
                        description: `Waiting ${delay / 1000}s before retry`,
                        duration: delay,
                    });

                    await new Promise(resolve => setTimeout(resolve, delay));
                    return attemptGeneration();
                } else {
                    // Final failure
                    const errorMessage = errorData?.error || apiError.message || 'AI generation failed';
                    const errorDetails = errorData?.details;

                    toast.error('Generation failed', {
                        description: errorMessage,
                        action: errorDetails?.suggestion ? {
                            label: 'See suggestion',
                            onClick: () => toast.info('Suggestion', {
                                description: errorDetails.suggestion,
                            }),
                        } : undefined,
                        duration: 5000,
                    });

                    onError?.(error);
                    throw error;
                }
            } finally {
                setLoading(false);
                setProgress('');
            }
        };

        return attemptGeneration();
    };

    return { generate, loading, progress };
}
