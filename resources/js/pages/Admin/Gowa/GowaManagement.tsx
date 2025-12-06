import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    XCircle,
    QrCode,
    RefreshCw,
    LogOut,
    Smartphone,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface GowaConfig {
    id: number;
    name: string;
    url: string;
    username: string;
    whatsapp_number: string;
    is_active: boolean;
}

interface Device {
    name: string;
    platform: string;
    connected: boolean;
}

interface Props {
    config: GowaConfig | null;
    devices: Device[];
    isConnected: boolean;
}

export default function GowaManagement({ config, devices, isConnected: initialIsConnected }: Props) {
    const { t } = useTranslation();
    const [isConnected, setIsConnected] = useState(initialIsConnected);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loadingQr, setLoadingQr] = useState(false);
    const [qrTimeout, setQrTimeout] = useState(20);
    const [devicesList, setDevicesList] = useState<Device[]>(devices);
    const [configForm, setConfigForm] = useState({
        url: config?.url || '',
        username: config?.username || '',
        password: '',
        whatsapp_number: config?.whatsapp_number || '',
    });
    const [saving, setSaving] = useState(false);

    // Poll status every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetch(route('admin.gowa.status'))
                .then(res => res.json())
                .then(data => {
                    setIsConnected(data.isConnected);
                    setDevicesList(data.devices || []);

                    // If connected and QR is showing, hide it
                    if (data.isConnected && qrCode) {
                        setQrCode(null);
                        toast.success(t('gowa.connected'));
                    }
                })
                .catch(console.error);
        }, 5000);

        return () => clearInterval(interval);
    }, [qrCode, t]);

    // QR timeout countdown
    useEffect(() => {
        if (qrCode && qrTimeout > 0) {
            const timer = setTimeout(() => setQrTimeout(qrTimeout - 1), 1000);
            return () => clearTimeout(timer);
        } else if (qrTimeout === 0 && qrCode) {
            setQrCode(null);
            toast.error(t('gowa.qr_expires_in', { seconds: 0 }));
        }
    }, [qrCode, qrTimeout, t]);

    const handleGenerateQR = async () => {
        setLoadingQr(true);
        try {
            const response = await fetch(route('admin.gowa.qr-code'));
            const data = await response.json();

            if (data.success && data.qr_code) {
                setQrCode(data.qr_code);
                setQrTimeout(data.timeout || 20);
                toast.success(t('gowa.scan_qr'));
            } else {
                toast.error(data.error || 'Failed to generate QR code');
            }
        } catch (error) {
            toast.error('Failed to generate QR code');
        } finally {
            setLoadingQr(false);
        }
    };

    const handleLogout = () => {
        router.post(route('admin.gowa.logout'), {}, {
            onSuccess: () => {
                setIsConnected(false);
                setDevicesList([]);
                toast.success(t('gowa.logout_success'));
            },
            onError: () => toast.error(t('gowa.logout_failed')),
        });
    };

    const handleReconnect = () => {
        router.post(route('admin.gowa.reconnect'), {}, {
            onSuccess: () => toast.success(t('gowa.reconnect_success')),
            onError: () => toast.error(t('gowa.reconnect_failed')),
        });
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch(route('admin.gowa.config.update'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(configForm),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(t('gowa.config_updated'));
                // Update form with new config
                if (data.config) {
                    setConfigForm({
                        url: data.config.url,
                        username: data.config.username,
                        password: '',
                        whatsapp_number: data.config.whatsapp_number,
                    });
                }
            } else {
                toast.error(data.message || 'Failed to update configuration');
            }
        } catch (error) {
            toast.error('Failed to update configuration');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">{t('gowa.management')}</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage WhatsApp GOWA connection and configuration
                    </p>
                </div>

                {/* Connection Status Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {t('gowa.connection_status')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            {isConnected ? (
                                <>
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                    <div>
                                        <Badge variant="default" className="bg-green-500">
                                            {t('gowa.connected')}
                                        </Badge>
                                        {config?.whatsapp_number && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {config.whatsapp_number}
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-6 w-6 text-red-500" />
                                    <Badge variant="destructive">{t('gowa.disconnected')}</Badge>
                                </>
                            )}
                        </div>

                        {/* Devices List */}
                        {devicesList.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">{t('gowa.connected_devices')}</h4>
                                <div className="space-y-2">
                                    {devicesList.map((device, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm">
                                            <Smartphone className="h-4 w-4" />
                                            <span>{device.name || device.platform}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* QR Code Section */}
                {!isConnected && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="h-5 w-5" />
                                {t('gowa.connect_whatsapp')}
                            </CardTitle>
                            <CardDescription>{t('gowa.scan_qr')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!qrCode ? (
                                <Button
                                    onClick={handleGenerateQR}
                                    disabled={loadingQr}
                                    className="w-full sm:w-auto"
                                >
                                    {loadingQr ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('gowa.loading_qr')}
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="mr-2 h-4 w-4" />
                                            {t('gowa.generate_qr')}
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <img
                                            src={qrCode}
                                            alt="QR Code"
                                            className="w-64 h-64 border-2 border-gray-200 rounded-lg"
                                        />
                                    </div>
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            {t('gowa.qr_expires_in', { seconds: qrTimeout })}
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Actions */}
                {isConnected && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('gowa.actions')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <Button
                                variant="destructive"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                {t('gowa.disconnect_whatsapp')}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleReconnect}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t('gowa.reconnect')}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('gowa.configuration')}</CardTitle>
                        <CardDescription>Update GOWA server configuration</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveConfig} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="url">{t('gowa.server_url')}</Label>
                                    <Input
                                        id="url"
                                        type="url"
                                        value={configForm.url}
                                        onChange={(e) => setConfigForm({ ...configForm, url: e.target.value })}
                                        placeholder="https://gowa.yourdomain.com"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsapp_number">{t('gowa.whatsapp_number')}</Label>
                                    <Input
                                        id="whatsapp_number"
                                        type="text"
                                        value={configForm.whatsapp_number}
                                        onChange={(e) => setConfigForm({ ...configForm, whatsapp_number: e.target.value })}
                                        placeholder="628123456789"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        value={configForm.username}
                                        onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={configForm.password}
                                        onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                                        placeholder="Leave empty to keep current"
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    t('gowa.save_configuration')
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Debug Panel */}
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="text-yellow-800">🔧 Debug Tools</CardTitle>
                        <CardDescription>Test GOWA server connection and view detailed logs</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    try {
                                        const response = await fetch(route('admin.gowa.test-connection'));
                                        const data = await response.json();

                                        console.log('Connection Test Result:', data);

                                        if (data.success) {
                                            toast.success(data.message);
                                        } else {
                                            toast.error(data.message);
                                        }

                                        // Display debug info
                                        if (data.debug) {
                                            console.table(data.debug);
                                            alert(JSON.stringify(data.debug, null, 2));
                                        }
                                    } catch (error) {
                                        toast.error('Failed to test connection');
                                        console.error(error);
                                    }
                                }}
                            >
                                Test Connection
                            </Button>

                            <Button
                                variant="outline"
                                onClick={async () => {
                                    try {
                                        const response = await fetch(route('admin.gowa.debug-status'));
                                        const data = await response.json();

                                        console.log('Debug Status:', data);
                                        alert(JSON.stringify(data, null, 2));
                                    } catch (error) {
                                        toast.error('Failed to get debug status');
                                        console.error(error);
                                    }
                                }}
                            >
                                View Debug Info
                            </Button>
                        </div>

                        <Alert className="bg-yellow-100 border-yellow-300">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800">
                                <strong>Debug Instructions:</strong>
                                <ol className="list-decimal ml-4 mt-2 space-y-1">
                                    <li>Click "Test Connection" to check if Laravel can reach GOWA server</li>
                                    <li>Check browser console (F12) for detailed error logs</li>
                                    <li>If connection fails, verify GOWA server URL and credentials</li>
                                    <li>Ensure GOWA server is running and accessible</li>
                                </ol>
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
