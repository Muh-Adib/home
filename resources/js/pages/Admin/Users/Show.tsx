import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type User, type BreadcrumbItem, type PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { 
    ArrowLeft,
    Edit,
    Trash2,
    Mail,
    Phone,
    MapPin,
    Calendar,
    User as UserIcon,
    Shield,
    Crown,
    Building2,
    Users,
    ClipboardList,
    DollarSign,
    Home,
    CheckCircle,
    XCircle,
    AlertCircle,
    Info,
    Globe,
    Cake,
    FileText,
    Lock
} from 'lucide-react';
import { useState } from 'react';

interface UserShowProps {
    user: User & {
        profile?: {
            address?: string;
            city?: string;
            state?: string;
            country?: string;
            postal_code?: string;
            birth_date?: string;
            gender?: 'male' | 'female' | 'other';
            bio?: string;
        };
        last_login_at?: string;
        created_at: string;
        updated_at: string;
    };
}

export default function UserShow({ user }: UserShowProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'User Management', href: '/admin/users' },
        { title: user.name },
    ];

    const handleDelete = () => {
        router.delete(`/admin/users/${user.id}`, {
            onSuccess: () => {
                router.visit('/admin/users');
            },
        });
    };

    const getRoleInfo = (role: User['role']) => {
        const roleConfig = {
            super_admin: { 
                label: 'Super Admin', 
                icon: Crown,
                color: 'bg-purple-100 text-purple-800 border-purple-200',
                description: 'Full system access and control'
            },
            property_owner: { 
                label: 'Property Owner', 
                icon: Building2,
                color: 'bg-blue-100 text-blue-800 border-blue-200',
                description: 'Owns and manages properties'
            },
            property_manager: { 
                label: 'Property Manager', 
                icon: Shield,
                color: 'bg-green-100 text-green-800 border-green-200',
                description: 'Manages multiple properties'
            },
            front_desk: { 
                label: 'Front Desk', 
                icon: ClipboardList,
                color: 'bg-orange-100 text-orange-800 border-orange-200',
                description: 'Handles check-in/out and guest services'
            },
            finance: { 
                label: 'Finance', 
                icon: DollarSign,
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                description: 'Manages payments and financial operations'
            },
            housekeeping: { 
                label: 'Housekeeping', 
                icon: Home,
                color: 'bg-gray-100 text-gray-800 border-gray-200',
                description: 'Cleaning and maintenance staff'
            },
            guest: { 
                label: 'Guest', 
                icon: Users,
                color: 'bg-slate-100 text-slate-800 border-slate-200',
                description: 'Customer with booking access'
            },
        };
        
        return roleConfig[role];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Check permissions
    const canEditUser = () => {
        if (auth.user.role === 'super_admin') return true;
        if (auth.user.role === 'property_owner' && user.role === 'guest') return true;
        return false;
    };

    const canDeleteUser = () => {
        return auth.user.role === 'super_admin' && user.id !== auth.user.id;
    };

    const roleInfo = getRoleInfo(user.role);
    const RoleIcon = roleInfo.icon;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/users">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Kembali ke Users
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Detail User</h1>
                            <p className="text-muted-foreground">
                                Informasi lengkap tentang {user.name}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                        {canEditUser() && (
                            <Button asChild variant="outline">
                                <Link href={`/admin/users/${user.id}/edit`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit User
                                </Link>
                            </Button>
                        )}
                        {canDeleteUser() && (
                            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus User
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader className="text-center">
                                <div className="flex justify-center mb-4">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <CardTitle className="text-xl">{user.name}</CardTitle>
                                <CardDescription>{user.email}</CardDescription>
                                
                                <div className="flex flex-col gap-2 mt-4">
                                    <Badge className={`inline-flex items-center gap-2 ${roleInfo.color}`}>
                                        <RoleIcon className="h-4 w-4" />
                                        {roleInfo.label}
                                    </Badge>
                                    <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                        {user.status === 'active' ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Aktif
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Tidak Aktif
                                            </>
                                        )}
                                    </Badge>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Details Cards */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Contact Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5" />
                                    Informasi Kontak
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Email</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    {user.phone && (
                                        <div className="flex items-center gap-3">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Telepon</p>
                                                <p className="text-sm text-muted-foreground">{user.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* System Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    Informasi Sistem
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Terdaftar Sejak</p>
                                            <p className="text-sm text-muted-foreground">{formatDate(user.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Terakhir Diperbarui</p>
                                            <p className="text-sm text-muted-foreground">{formatDate(user.updated_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">User ID</p>
                                            <p className="text-sm text-muted-foreground">#{user.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Role</p>
                                            <p className="text-sm text-muted-foreground">{roleInfo.description}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Account Status Alert */}
                        {user.status !== 'active' && (
                            <Alert className="border-orange-200 bg-orange-50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Akun user ini saat ini <strong>tidak aktif</strong>. 
                                    User tidak dapat mengakses sistem sampai status diubah menjadi aktif.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Hapus User</DialogTitle>
                            <DialogDescription>
                                Apakah Anda yakin ingin menghapus user "<strong>{user.name}</strong>"? 
                                Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data user secara permanen.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Batal
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                Hapus User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
} 