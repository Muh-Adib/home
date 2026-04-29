import { useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { apiGet } from '@/lib/api';

interface ExistingUser {
    id: number;
    name: string;
    email: string;
    phone: string;
}

interface UseEmailUserDetectionResult {
    isChecking: boolean;
    foundUser: ExistingUser | null;
    showLoginNotice: boolean;
    checkEmailExists: (email: string) => Promise<void>;
    dismissLoginNotice: () => void;
    clearFoundUser: () => void;
}

export function useEmailUserDetection(): UseEmailUserDetectionResult {
    const page = usePage();
    const [isChecking, setIsChecking] = useState(false);
    const [foundUser, setFoundUser] = useState<ExistingUser | null>(null);
    const [showLoginNotice, setShowLoginNotice] = useState(false);

    const checkEmailExists = useCallback(async (email: string): Promise<void> => {
        if (!email || !email.includes('@')) {
            setFoundUser(null);
            setShowLoginNotice(false);
            return;
        }
        
        setIsChecking(true);
        try {
            const result = await apiGet<{ exists: boolean; user?: ExistingUser }>('/api/check-email', { email });
            
            if (result.exists && result.user) {
                setFoundUser(result.user);
                setShowLoginNotice(true);
            } else {
                setFoundUser(null);
                setShowLoginNotice(false);
            }
        } catch (error) {
            console.error('Error checking email:', error);
            setFoundUser(null);
            setShowLoginNotice(false);
        } finally {
            setIsChecking(false);
        }
    }, []);

    const dismissLoginNotice = useCallback(() => {
        setShowLoginNotice(false);
    }, []);

    const clearFoundUser = useCallback(() => {
        setFoundUser(null);
        setShowLoginNotice(false);
    }, []);

    return {
        isChecking,
        foundUser,
        showLoginNotice,
        checkEmailExists,
        dismissLoginNotice,
        clearFoundUser
    };
}