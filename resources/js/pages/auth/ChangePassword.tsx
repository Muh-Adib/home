import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface ChangePasswordProps {
    isNewUser: boolean;
}

export default function ChangePassword({ isNewUser }: ChangePasswordProps) {
    const { data, setData, post, processing, errors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/password/change');
    };

    return (
        <>
            <Head title="Ganti Password" />
            
            <div className="min-h-screen bg-brand-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md card-modern">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 w-12 h-12 bg-brand-primary-20 rounded-full flex items-center justify-center">
                            <Lock className="h-6 w-6 text-brand-primary" />
                        </div>
                        <CardTitle className="text-2xl">Ganti Password</CardTitle>
                        <CardDescription>
                            {isNewUser 
                                ? 'Silakan buat password baru untuk akun Anda'
                                : 'Masukkan password baru Anda'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isNewUser && (
                            <Alert className="mb-6 border-blue-200 bg-blue-50">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800">
                                    <strong>Akun baru berhasil dibuat!</strong> Silakan buat password yang aman untuk melanjutkan.
                                </AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password Baru *</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    minLength={8}
                                    className={errors.password ? 'border-red-500' : ''}
                                />
                                {errors.password && (
                                    <p className="text-sm text-red-500">{errors.password}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Minimal 8 karakter
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">Konfirmasi Password *</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                    className={errors.password_confirmation ? 'border-red-500' : ''}
                                />
                                {errors.password_confirmation && (
                                    <p className="text-sm text-red-500">{errors.password_confirmation}</p>
                                )}
                            </div>

                            {errors.error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{errors.error}</AlertDescription>
                                </Alert>
                            )}

                            <Button 
                                type="submit" 
                                className="w-full btn-primary" 
                                disabled={processing}
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Password'}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Sudah punya password?{' '}
                                <Link href="/login" className="text-brand-primary hover:underline">
                                    Masuk
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

