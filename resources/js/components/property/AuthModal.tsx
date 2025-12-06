import React from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    returnUrl: string;
}

export function AuthModal({ open, onOpenChange, returnUrl }: AuthModalProps) {
    const { t } = useTranslation();

    const handleLogin = () => {
        router.visit(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    };

    const handleRegister = () => {
        router.visit(`/register?redirect=${encodeURIComponent(returnUrl)}`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-xl p-6 shadow-lg">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="flex flex-col items-center gap-3 text-2xl font-semibold">
                        <div className="p-2 rounded-full bg-brand-primary/10">
                            <AlertCircle className="h-15 w-15 text-brand-primary" />
                        </div>
                        {t('auth.login_required')}
                    </DialogTitle>

                    <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                        {t('auth.login_required_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <Alert className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 mt-1 text-brand-primary" />
                            <AlertDescription className="text-brand-primary text-sm">
                                {t('auth.booking_saved_message')}
                            </AlertDescription>
                        </div>
                    </Alert>
                </div>

                <DialogFooter className="mt-6 flex flex-col gap-3">
                    <Button
                        onClick={handleLogin}
                        className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg py-3 text-base"
                    >
                        <LogIn className="h-4 w-4 mr-2" />
                        {t('auth.sign_in')}
                    </Button>

                    <Button
                        onClick={handleRegister}
                        variant="outline"
                        className="w-full rounded-lg py-3 text-base border-brand-primary/30 hover:bg-brand-primary/10 hover:border-brand-primary/50"
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('auth.sign_up')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
