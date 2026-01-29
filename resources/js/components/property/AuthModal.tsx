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
import AppLogo from '@/components/app-logo';

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
            <DialogContent className="sm:max-w-[400px] flex flex-col gap-0 p-0 overflow-hidden border-none shadow-2xl">
                <div className="relative h-32 w-full flex items-center justify-center overflow-hidden bg-brand-primary/5">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent" />
                    {/* Decorative elements */}
                    <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-brand-primary/5 blur-3xl text-brand-primary" />
                    <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-brand-primary/5 blur-3xl text-brand-primary" />

                    <div className="z-10 transform scale-[2.0]">
                        <AppLogo />
                    </div>
                </div>

                <div className="px-6 pt-2 pb-6">
                    <DialogHeader className="mb-5 space-y-2">
                        <DialogTitle className="text-center text-xl font-bold tracking-tight">
                            {t('auth.login_required')}
                        </DialogTitle>
                        <DialogDescription className="text-center text-sm text-muted-foreground">
                            {t('auth.login_required_description')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mb-6">
                        <Alert className="border-brand-primary/10 bg-brand-primary/5 text-brand-primary py-3">
                            <AlertCircle className="h-4 w-4 stroke-brand-primary" />
                            <AlertDescription className="ml-2 text-xs font-medium">
                                {t('auth.booking_saved_message')}
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:space-x-0">
                        <Button
                            onClick={handleLogin}
                            className="h-10 w-full bg-brand-primary font-medium text-white shadow-md shadow-brand-primary/10 transition-all hover:bg-brand-primary/90 hover:shadow-brand-primary/20"
                        >
                            <LogIn className="mr-2 h-4 w-4" />
                            {t('auth.sign_in')}
                        </Button>

                        <Button
                            onClick={handleRegister}
                            variant="ghost"
                            className="h-10 w-full border border-input bg-transparent font-medium hover:bg-accent hover:text-accent-foreground"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            {t('auth.sign_up')}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
