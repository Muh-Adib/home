import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { type User, type BreadcrumbItem, type PageProps } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { 
    ArrowLeft,
    Save,
    Upload,
    User as UserIcon,
    Shield,
    Crown,
    Building2,
    Users,
    ClipboardList,
    DollarSign,
    Home,
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';
import { useState, useRef } from 'react';

interface UserEditProps {
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
    };
}

export default function UserEdit({ user }: UserEditProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const { data, setData, put, processing, errors, reset } = useForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'guest',
        status: user.status || 'active',
        password: '',
        password_confirmation: '',
        avatar: null as File | null,
        address: user.profile?.address || '',
        city: user.profile?.city || '',
        state: user.profile?.state || '',
        country: user.profile?.country || 'Indonesia',
        postal_code: user.profile?.postal_code || '',
        birth_date: user.profile?.birth_date ? user.profile.birth_date.split('T')[0] : '',
        gender: user.profile?.gender || '',
        bio: user.profile?.bio || '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'User Management', href: '/admin/users' },
        { title: user.name, href: `/admin/users/${user.id}` },
        { title: 'Edit' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/users/${user.id}`, {
            preserveScroll: true,
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('avatar', file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const getRoleInfo = (role: User['role']) => {
        const roleConfig = {
            super_admin: { 
                label: 'Super Admin', 
                icon: Crown,
                description: 'Full system access and control'
            },
            property_owner: { 
                label: 'Property Owner', 
                icon: Building2,
                description: 'Owns and manages properties'
            },
            property_manager: { 
                label: 'Property Manager', 
                icon: Shield,
                description: 'Manages multiple properties'
            },
            front_desk: { 
                label: 'Front Desk', 
                icon: ClipboardList,
                description: 'Handles check-in/out and guest services'
            },
            finance: { 
                label: 'Finance', 
                icon: DollarSign,
                description: 'Manages payments and financial operations'
            },
            housekeeping: { 
                label: 'Housekeeping', 
                icon: Home,
                description: 'Cleaning and maintenance staff'
            },
            guest: { 
                label: 'Guest', 
                icon: Users,
                description: 'Customer with booking access'
            },
        };
        
        return roleConfig[role];
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Check permissions
    const canEditRole = () => {
        return auth.user.role === 'super_admin';
    };

    const canEditStatus = () => {
        return auth.user.role === 'super_admin' && user.id !== auth.user.id;
    };

    const availableRoles = canEditRole() ? [
        'super_admin', 'property_owner', 'property_manager', 
        'front_desk', 'finance', 'housekeeping', 'guest'
    ] : ['guest'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/admin/users/${user.id}`}>
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Kembali ke Detail
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Edit User</h1>
                            <p className="text-muted-foreground">
                                Edit informasi untuk {user.name}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Profile Picture */}
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Foto Profile</CardTitle>
                                    <CardDescription>
                                        Upload foto profile user (max 2MB)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center space-y-4">
                                        <Avatar className="h-24 w-24">
                                            <AvatarImage src={previewImage || user.avatar} alt={user.name} />
                                            <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                        
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Foto
                                        </Button>
                                        
                                        {errors.avatar && (
                                            <p className="text-sm text-red-600">{errors.avatar}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Form Fields */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informasi Dasar</CardTitle>
                                    <CardDescription>
                                        Informasi dasar tentang user
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nama Lengkap</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            error={errors.name}
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-red-600">{errors.name}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            error={errors.email}
                                            required
                                        />
                                        {errors.email && (
                                            <p className="text-sm text-red-600">{errors.email}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telepon</Label>
                                        <Input
                                            id="phone"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            error={errors.phone}
                                            placeholder="Nomor telepon"
                                        />
                                        {errors.phone && (
                                            <p className="text-sm text-red-600">{errors.phone}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Jenis Kelamin</Label>
                                        <Select value={data.gender} onValueChange={(value) => setData('gender', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih jenis kelamin" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Laki-laki</SelectItem>
                                                <SelectItem value="female">Perempuan</SelectItem>
                                                <SelectItem value="other">Lainnya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.gender && (
                                            <p className="text-sm text-red-600">{errors.gender}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="birth_date">Tanggal Lahir</Label>
                                        <Input
                                            id="birth_date"
                                            type="date"
                                            value={data.birth_date}
                                            onChange={(e) => setData('birth_date', e.target.value)}
                                            error={errors.birth_date}
                                        />
                                        {errors.birth_date && (
                                            <p className="text-sm text-red-600">{errors.birth_date}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="country">Negara</Label>
                                        <Input
                                            id="country"
                                            value={data.country}
                                            onChange={(e) => setData('country', e.target.value)}
                                            error={errors.country}
                                        />
                                        {errors.country && (
                                            <p className="text-sm text-red-600">{errors.country}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* System Settings */}
                            {(canEditRole() || canEditStatus()) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Pengaturan Sistem</CardTitle>
                                        <CardDescription>
                                            Role dan status akun user
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {canEditRole() && (
                                            <div className="space-y-2">
                                                <Label htmlFor="role">Role</Label>
                                                <Select value={data.role} onValueChange={(value) => setData('role', value as User['role'])}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableRoles.map((role) => {
                                                            const roleInfo = getRoleInfo(role as User['role']);
                                                            const Icon = roleInfo.icon;
                                                            return (
                                                                <SelectItem key={role} value={role}>
                                                                    <div className="flex items-center gap-2">
                                                                        <Icon className="h-4 w-4" />
                                                                        {roleInfo.label}
                                                                    </div>
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                                {errors.role && (
                                                    <p className="text-sm text-red-600">{errors.role}</p>
                                                )}
                                            </div>
                                        )}

                                        {canEditStatus() && (
                                            <div className="space-y-2">
                                                <Label htmlFor="status">Status</Label>
                                                <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Aktif</SelectItem>
                                                        <SelectItem value="inactive">Tidak Aktif</SelectItem>
                                                        <SelectItem value="suspended">Suspended</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.status && (
                                                    <p className="text-sm text-red-600">{errors.status}</p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Password Change */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Ubah Password</CardTitle>
                                    <CardDescription>
                                        Kosongkan jika tidak ingin mengubah password
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password Baru</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                error={errors.password}
                                                placeholder="Password baru"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p className="text-sm text-red-600">{errors.password}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation">Konfirmasi Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password_confirmation"
                                                type={showPasswordConfirmation ? "text" : "password"}
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                                error={errors.password_confirmation}
                                                placeholder="Konfirmasi password baru"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                            >
                                                {showPasswordConfirmation ? (
                                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                        {errors.password_confirmation && (
                                            <p className="text-sm text-red-600">{errors.password_confirmation}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Address Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informasi Alamat</CardTitle>
                                    <CardDescription>
                                        Alamat lengkap user
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Alamat</Label>
                                        <Textarea
                                            id="address"
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            placeholder="Alamat lengkap"
                                            rows={3}
                                        />
                                        {errors.address && (
                                            <p className="text-sm text-red-600">{errors.address}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="city">Kota</Label>
                                            <Input
                                                id="city"
                                                value={data.city}
                                                onChange={(e) => setData('city', e.target.value)}
                                                error={errors.city}
                                                placeholder="Nama kota"
                                            />
                                            {errors.city && (
                                                <p className="text-sm text-red-600">{errors.city}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="state">Provinsi</Label>
                                            <Input
                                                id="state"
                                                value={data.state}
                                                onChange={(e) => setData('state', e.target.value)}
                                                error={errors.state}
                                                placeholder="Nama provinsi"
                                            />
                                            {errors.state && (
                                                <p className="text-sm text-red-600">{errors.state}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="postal_code">Kode Pos</Label>
                                            <Input
                                                id="postal_code"
                                                value={data.postal_code}
                                                onChange={(e) => setData('postal_code', e.target.value)}
                                                error={errors.postal_code}
                                                placeholder="Kode pos"
                                            />
                                            {errors.postal_code && (
                                                <p className="text-sm text-red-600">{errors.postal_code}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Bio */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Bio</CardTitle>
                                    <CardDescription>
                                        Deskripsi singkat tentang user
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Textarea
                                            id="bio"
                                            value={data.bio}
                                            onChange={(e) => setData('bio', e.target.value)}
                                            placeholder="Bio atau deskripsi tentang user..."
                                            rows={4}
                                        />
                                        {errors.bio && (
                                            <p className="text-sm text-red-600">{errors.bio}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4">
                        <Link href={`/admin/users/${user.id}`}>
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 