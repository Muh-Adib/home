import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
    Mail,
    Server,
    Shield,
    Bell,
    Send,
    Save,
    RotateCcw,
    Info,
    AlertTriangle,
    TestTube
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface EmailSettings {
    mail_driver: string;
    mail_host?: string;
    mail_port?: number;
    mail_username?: string;
    mail_password?: string;
    mail_encryption?: string;
    mail_from_address: string;
    mail_from_name: string;
    send_booking_confirmation: boolean;
    send_payment_reminder: boolean;
    send_check_in_reminder: boolean;
    send_review_request: boolean;
    notification_emails?: string;
}

interface EmailSettingsProps {
    settings: EmailSettings;
}

export default function EmailSettings({ settings }: EmailSettingsProps) {
    const { data, setData, post, processing, errors, reset } = useForm<EmailSettings & { test_email?: string }>({
        mail_driver: settings.mail_driver,
        mail_host: settings.mail_host,
        mail_port: settings.mail_port,
        mail_username: settings.mail_username,
        mail_password: settings.mail_password,
        mail_encryption: settings.mail_encryption,
        mail_from_address: settings.mail_from_address,
        mail_from_name: settings.mail_from_name,
        send_booking_confirmation: settings.send_booking_confirmation,
        send_payment_reminder: settings.send_payment_reminder,
        send_check_in_reminder: settings.send_check_in_reminder,
        send_review_request: settings.send_review_request,
        notification_emails: settings.notification_emails,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'Email', href: '#' },
    ];

    const mailDrivers = [
        { value: 'smtp', label: 'SMTP' },
        { value: 'sendmail', label: 'Sendmail' },
        { value: 'mailgun', label: 'Mailgun' },
        { value: 'ses', label: 'Amazon SES' },
        { value: 'postmark', label: 'Postmark' },
    ];

    const encryptionOptions = [
        { value: '', label: 'None' },
        { value: 'tls', label: 'TLS' },
        { value: 'ssl', label: 'SSL' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/settings/email');
    };

    const handleReset = () => {
        reset();
    };

    const handleTestEmail = () => {
        if (data.test_email) {
            post('/admin/settings/email/test', {
                data: { test_email: data.test_email },
                preserveState: true,
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Email Settings - Admin Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Mail className="h-8 w-8 text-purple-600" />
                            Email Settings
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Configure SMTP settings and email notification preferences
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* SMTP Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5" />
                                SMTP Configuration
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Configure your email server settings for sending emails
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="mail_driver">Mail Driver *</Label>
                                    <Select value={data.mail_driver} onValueChange={(value) => setData('mail_driver', value)}>
                                        <SelectTrigger className={errors.mail_driver ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select mail driver" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mailDrivers.map(driver => (
                                                <SelectItem key={driver.value} value={driver.value}>
                                                    {driver.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.mail_driver && (
                                        <p className="text-sm text-red-600 mt-1">{errors.mail_driver}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="mail_from_name">From Name *</Label>
                                    <Input
                                        id="mail_from_name"
                                        value={data.mail_from_name}
                                        onChange={(e) => setData('mail_from_name', e.target.value)}
                                        className={errors.mail_from_name ? 'border-red-500' : ''}
                                        placeholder="Property Management System"
                                    />
                                    {errors.mail_from_name && (
                                        <p className="text-sm text-red-600 mt-1">{errors.mail_from_name}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="mail_from_address">From Email Address *</Label>
                                <Input
                                    id="mail_from_address"
                                    type="email"
                                    value={data.mail_from_address}
                                    onChange={(e) => setData('mail_from_address', e.target.value)}
                                    className={errors.mail_from_address ? 'border-red-500' : ''}
                                    placeholder="noreply@propertyms.com"
                                />
                                {errors.mail_from_address && (
                                    <p className="text-sm text-red-600 mt-1">{errors.mail_from_address}</p>
                                )}
                            </div>

                            {data.mail_driver === 'smtp' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="mail_host">SMTP Host *</Label>
                                            <Input
                                                id="mail_host"
                                                value={data.mail_host || ''}
                                                onChange={(e) => setData('mail_host', e.target.value)}
                                                className={errors.mail_host ? 'border-red-500' : ''}
                                                placeholder="smtp.gmail.com"
                                            />
                                            {errors.mail_host && (
                                                <p className="text-sm text-red-600 mt-1">{errors.mail_host}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="mail_port">SMTP Port *</Label>
                                            <Input
                                                id="mail_port"
                                                type="number"
                                                value={data.mail_port || ''}
                                                onChange={(e) => setData('mail_port', parseInt(e.target.value) || undefined)}
                                                className={errors.mail_port ? 'border-red-500' : ''}
                                                placeholder="587"
                                            />
                                            {errors.mail_port && (
                                                <p className="text-sm text-red-600 mt-1">{errors.mail_port}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="mail_username">SMTP Username</Label>
                                            <Input
                                                id="mail_username"
                                                value={data.mail_username || ''}
                                                onChange={(e) => setData('mail_username', e.target.value)}
                                                className={errors.mail_username ? 'border-red-500' : ''}
                                                placeholder="your-email@gmail.com"
                                            />
                                            {errors.mail_username && (
                                                <p className="text-sm text-red-600 mt-1">{errors.mail_username}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="mail_password">SMTP Password</Label>
                                            <Input
                                                id="mail_password"
                                                type="password"
                                                value={data.mail_password || ''}
                                                onChange={(e) => setData('mail_password', e.target.value)}
                                                className={errors.mail_password ? 'border-red-500' : ''}
                                                placeholder="••••••••"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Leave blank to keep current password
                                            </p>
                                            {errors.mail_password && (
                                                <p className="text-sm text-red-600 mt-1">{errors.mail_password}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="mail_encryption">Encryption</Label>
                                        <Select value={data.mail_encryption || ''} onValueChange={(value) => setData('mail_encryption', value || undefined)}>
                                            <SelectTrigger className={errors.mail_encryption ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select encryption" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {encryptionOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.mail_encryption && (
                                            <p className="text-sm text-red-600 mt-1">{errors.mail_encryption}</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Email Test */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TestTube className="h-5 w-5" />
                                Test Email Configuration
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Send a test email to verify your configuration
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Label htmlFor="test_email">Test Email Address</Label>
                                    <Input
                                        id="test_email"
                                        type="email"
                                        value={data.test_email || ''}
                                        onChange={(e) => setData('test_email', e.target.value)}
                                        placeholder="test@example.com"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleTestEmail}
                                        disabled={!data.test_email || processing}
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Test
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification Preferences */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notification Preferences
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                                Configure which email notifications to send automatically
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Booking Confirmation</Label>
                                        <p className="text-sm text-gray-600">
                                            Send confirmation email when booking is created
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.send_booking_confirmation}
                                        onCheckedChange={(checked) => setData('send_booking_confirmation', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Payment Reminder</Label>
                                        <p className="text-sm text-gray-600">
                                            Send reminder emails for pending payments
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.send_payment_reminder}
                                        onCheckedChange={(checked) => setData('send_payment_reminder', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Check-in Reminder</Label>
                                        <p className="text-sm text-gray-600">
                                            Send reminder emails before check-in date
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.send_check_in_reminder}
                                        onCheckedChange={(checked) => setData('send_check_in_reminder', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Review Request</Label>
                                        <p className="text-sm text-gray-600">
                                            Send review request emails after check-out
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.send_review_request}
                                        onCheckedChange={(checked) => setData('send_review_request', checked)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="notification_emails">Admin Notification Emails</Label>
                                <Textarea
                                    id="notification_emails"
                                    value={data.notification_emails || ''}
                                    onChange={(e) => setData('notification_emails', e.target.value)}
                                    className={errors.notification_emails ? 'border-red-500' : ''}
                                    rows={3}
                                    placeholder="admin@propertyms.com, manager@propertyms.com"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Comma-separated list of email addresses to receive admin notifications
                                </p>
                                {errors.notification_emails && (
                                    <p className="text-sm text-red-600 mt-1">{errors.notification_emails}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Alert */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Email settings changes will take effect immediately. Make sure to test your configuration 
                            before enabling automatic notifications to avoid delivery issues.
                        </AlertDescription>
                    </Alert>

                    {/* Warning Alert */}
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            For Gmail and other providers, you may need to use App Passwords instead of your regular password. 
                            Ensure your SMTP credentials are correct to avoid authentication failures.
                        </AlertDescription>
                    </Alert>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            disabled={processing}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 