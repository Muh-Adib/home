import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type User, type BreadcrumbItem, type PaginatedData, type PageProps } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { 
    Search, 
    Filter, 
    MoreHorizontal,
    Edit,
    Eye,
    Trash2,
    Plus,
    UserPlus,
    Shield,
    ShieldCheck,
    ShieldX,
    Crown,
    Building2,
    Users,
    ClipboardList,
    DollarSign,
    Home,
    AlertCircle,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { useState } from 'react';

interface UsersIndexProps {
    users: PaginatedData<User>;
    filters: {
        search?: string;
        role?: string;
        status?: string;
    };
    stats: {
        total_users: number;
        active_users: number;
        pending_users: number;
        role_breakdown: Record<string, number>;
    };
}

export default function UsersIndex({ users, filters, stats }: UsersIndexProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { processing, patch } = useForm();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'User Management' },
    ];

    const handleSearch = () => {
        router.get('/admin/users', {
            search: searchTerm,
            role: roleFilter !== 'all' ? roleFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleStatusToggle = (user: User) => {
        router.patch(`/admin/users/${user.id}/status`, {}, {
            preserveScroll: true,
        });
    };

    const handleDelete = (user: User) => {
        setSelectedUser(user);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (!selectedUser) return;

        router.delete(`/admin/users/${selectedUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteDialog(false);
                setSelectedUser(null);
            },
        });
    };

    const getRoleBadge = (role: User['role']) => {
        const roleConfig = {
            super_admin: { 
                variant: 'default' as const, 
                label: 'Super Admin', 
                icon: Crown,
                color: 'bg-purple-100 text-purple-800'
            },
            property_owner: { 
                variant: 'secondary' as const, 
                label: 'Property Owner', 
                icon: Building2,
                color: 'bg-blue-100 text-blue-800'
            },
            property_manager: { 
                variant: 'secondary' as const, 
                label: 'Property Manager', 
                icon: Shield,
                color: 'bg-green-100 text-green-800'
            },
            front_desk: { 
                variant: 'outline' as const, 
                label: 'Front Desk', 
                icon: ClipboardList,
                color: 'bg-orange-100 text-orange-800'
            },
            finance: { 
                variant: 'outline' as const, 
                label: 'Finance', 
                icon: DollarSign,
                color: 'bg-yellow-100 text-yellow-800'
            },
            housekeeping: { 
                variant: 'outline' as const, 
                label: 'Housekeeping', 
                icon: Home,
                color: 'bg-gray-100 text-gray-800'
            },
            guest: { 
                variant: 'outline' as const, 
                label: 'Guest', 
                icon: Users,
                color: 'bg-slate-100 text-slate-800'
            },
        };
        
        const config = roleConfig[role];
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className={`inline-flex items-center gap-1 ${config.color}`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const getStatusBadge = (status: 'active' | 'inactive') => {
        return status === 'active' 
            ? <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
            : <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Check permissions
    const canManageUsers = auth.user.role === 'super_admin';
    const canEditUser = (user: User) => {
        if (auth.user.role === 'super_admin') return true;
        if (auth.user.role === 'property_owner' && user.role === 'guest') return true;
        return false;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Management</h1>
                        <p className="text-muted-foreground">
                            Manage system users, roles, and permissions
                        </p>
                    </div>
                    
                    {canManageUsers && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button asChild className="w-full sm:w-auto">
                                <Link href="/admin/users/create">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add User
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_users || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                All registered users
                            </p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.active_users}</div>
                            <p className="text-xs text-muted-foreground">
                                Currently active
                            </p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Admins</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {(stats.role_breakdown.super_admin || 0) + 
                                 (stats.role_breakdown.property_manager || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Administrative users
                            </p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Property Owners</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.role_breakdown.property_owner || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                Property owners
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="User Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                        <SelectItem value="property_owner">Property Owner</SelectItem>
                                        <SelectItem value="property_manager">Property Manager</SelectItem>
                                        <SelectItem value="front_desk">Front Desk</SelectItem>
                                        <SelectItem value="finance">Finance</SelectItem>
                                        <SelectItem value="housekeeping">Housekeeping</SelectItem>
                                        <SelectItem value="guest">Guest</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button onClick={handleSearch} className="w-full">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Users</CardTitle>
                        <CardDescription>
                            {users.total} users found
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Login</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={user.avatar} alt={user.name} />
                                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{user.name}</div>
                                                        <div className="text-sm text-muted-foreground">{user.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getRoleBadge(user.role)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(user.status as 'active' | 'inactive')}
                                                    {canManageUsers && (
                                                        <Switch
                                                            checked={user.status === 'active'}
                                                            onCheckedChange={() => handleStatusToggle(user)}
                                                            disabled={processing || user.id === auth.user.id}
                                                            className="h-4 w-4"
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {user.last_login_at ? (
                                                    <div className="text-sm">
                                                        {formatDate(user.last_login_at)}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Never</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {formatDate(user.created_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/users/${user.id}`}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        
                                                        {canEditUser(user) && (
                                                            <>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/admin/users/${user.id}/edit`}>
                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                        Edit User
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                
                                                                {canManageUsers && user.id !== auth.user.id && (
                                                                    <>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem 
                                                                            onClick={() => handleDelete(user)}
                                                                            className="text-red-600"
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete User
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {users.data.length === 0 && (
                                <div className="text-center py-8">
                                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-2 text-sm font-semibold">No users found</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Try adjusting your search filters.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {users.data.length > 0 && (
                            <div className="flex items-center justify-between space-x-2 py-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {users.from} to {users.to} of {users.total} users
                                </div>
                                <div className="flex items-center space-x-2">
                                    {users.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => link.url && router.visit(link.url)}
                                            disabled={!link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete User</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete user "{selectedUser?.name}"? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter>
                            <Button 
                                variant="outline" 
                                onClick={() => setShowDeleteDialog(false)}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="destructive"
                                onClick={confirmDelete} 
                                disabled={processing}
                            >
                                {processing ? 'Deleting...' : 'Delete User'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
} 