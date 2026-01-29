import { useState } from 'react';
import axios, { AxiosError } from 'axios';
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

                const response = await axios.post(endpoint, data);

                if (response.data.success) {
                    onSuccess?.(response.data);
                    return response.data;
                } else {
                    throw new Error(response.data.error || 'Generation failed');
                }
            } catch (error: any) {
                const axiosError = error as AxiosError<AIErrorResponse>;
                const errorData = axiosError.response?.data;

                // Check if we should retry
                if (retries < maxRetries && errorData?.retry_suggested) {
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
                    const errorMessage = errorData?.error || error.message || 'AI generation failed';
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
