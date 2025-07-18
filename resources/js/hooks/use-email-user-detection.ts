import { useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';

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
            const response = await fetch(route('booking.check-email'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': page.props.csrf_token,
                },
                body: JSON.stringify({ email }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to check email');
            }
            
            const result = await response.json();
            
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
    }, [page.props.csrf_token]);

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