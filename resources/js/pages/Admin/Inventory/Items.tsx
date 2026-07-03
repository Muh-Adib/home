import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Trash2, ArrowUpDown, Search, Package, AlertCircle, CheckCircle2, Save, X, Plus, Coins, Tag, UploadCloud, Layers, LayoutGrid, List, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface Item {
  id: number;
  name: string;
  sku: string;
  unit: string;
  min_stock: number;
  selling_price: number;
  category: string | null;
  image_path: string | null;
  current_stock: number;
  is_below_min: boolean;
  assigned_user_id: number | null;
  assigned_user: {
    id: number;
    name: string;
    role: string;
  } | null;
}

interface ItemsProps {
  items: Item[];
  staffUsers?: {
    id: number;
    name: string;
    role: string;
  }[];
}

function formatRupiah(amount: number) {
  const val = Math.round(amount || 0);
  return 'Rp ' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function Items({ items, staffUsers = [] }: ItemsProps) {
  // Global form for creating new item
  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    sku: '',
    unit: 'pcs',
    min_stock: '',
    selling_price: '',
    category: '',
    image: null as File | null,
    assigned_user_id: '',
  });

  // Local state for inline card editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editAssignedUserId, setEditAssignedUserId] = useState<string>('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // View mode switcher: 'card' (default) or 'list'
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Sorting and searching
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');

  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const { delete: destroy } = useForm();

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    router.get('/admin/inventory/items', {
      sort: key,
      direction: direction
    }, {
      preserveState: true,
      preserveScroll: true,
      only: ['items']
    });
  };

  // Submit new item form
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== null && v !== undefined) formData.append(k, v as any);
    });

    router.post('/admin/inventory/items', formData, {
      forceFormData: true,
      onSuccess: () => {
        reset();
      },
    });
  };

  // Inline editing lifecycle
  const startEditing = (item: Item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditSku(item.sku || '');
    setEditUnit(item.unit);
    setEditMinStock(String(item.min_stock || 0));
    setEditSellingPrice(String(item.selling_price || 0));
    setEditCategory(item.category || '');
    setEditAssignedUserId(item.assigned_user_id?.toString() || '');
    setEditImage(null);
    setEditErrors({});
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditErrors({});
  };

  const handleUpdateSubmit = (id: number) => {
    setIsUpdating(true);
    setEditErrors({});

    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('name', editName);
    formData.append('sku', editSku);
    formData.append('unit', editUnit);
    formData.append('min_stock', editMinStock);
    formData.append('selling_price', editSellingPrice);
    formData.append('category', editCategory);
    formData.append('assigned_user_id', editAssignedUserId);
    if (editImage) {
      formData.append('image', editImage);
    }

    router.post(`/admin/inventory/items/${id}`, formData, {
      forceFormData: true,
      onSuccess: () => {
        setEditingId(null);
        setIsUpdating(false);
        router.reload();
      },
      onError: (errs) => {
        setEditErrors(errs);
        setIsUpdating(false);
      }
    });
  };

  // Handle Delete dialog
  const initiateDelete = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      destroy(`/admin/inventory/items/${itemToDelete.id}`, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setItemToDelete(null);
          router.reload();
        },
      });
    }
  };

  // Client-side search filtering
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group filteredItems by unit for List view mode
  const groupedByUnit: Record<string, Item[]> = {};
  filteredItems.forEach(item => {
    const unitKey = item.unit.toUpperCase();
    if (!groupedByUnit[unitKey]) {
      groupedByUnit[unitKey] = [];
    }
    groupedByUnit[unitKey].push(item);
  });

  // Sort each unit group by stock level (low stock first, then current_stock asc)
  Object.keys(groupedByUnit).forEach(unitKey => {
    groupedByUnit[unitKey].sort((a, b) => {
      if (a.is_below_min && !b.is_below_min) return -1;
      if (!a.is_below_min && b.is_below_min) return 1;
      return a.current_stock - b.current_stock;
    });
  });

  return (
    <AdminLayout title="Inventaris" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Inventory', href: '/admin/inventory/items' }]}>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">

        {/* Create Item Form Section */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Tambah Item Baru</CardTitle>
                <CardDescription>Masukkan barang baru ke dalam sistem inventaris Anda.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleCreateSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700">Nama Item</Label>
                  <Input
                    placeholder="Contoh: Sabun Mandi Cair"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    required
                    className="bg-white/50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Kategori</Label>
                  <Input
                    placeholder="Contoh: Kebersihan / Amenities"
                    value={data.category}
                    onChange={(e) => setData('category', e.target.value)}
                    className="bg-white/50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  />
                  {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">SKU (Stock Keeping Unit)</Label>
                  <Input
                    placeholder="Dibuat otomatis jika kosong"
                    value={data.sku}
                    onChange={(e) => setData('sku', e.target.value)}
                    className="bg-white/50 border-slate-200 focus:bg-white transition-all rounded-xl font-mono"
                  />
                  {errors.sku && <p className="text-xs text-red-500">{errors.sku}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Satuan</Label>
                  <Input
                    placeholder="Contoh: pcs, botol"
                    value={data.unit}
                    onChange={(e) => setData('unit', e.target.value)}
                    required
                    className="bg-white/50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  />
                  {errors.unit && <p className="text-xs text-red-500">{errors.unit}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Min. Stok (Alert)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Contoh: 10"
                    value={data.min_stock}
                    onChange={(e) => setData('min_stock', e.target.value)}
                    className="bg-white/50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  />
                  {errors.min_stock && <p className="text-xs text-red-500">{errors.min_stock}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Harga Jual (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium">Rp</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={data.selling_price}
                      onChange={(e) => setData('selling_price', e.target.value)}
                      className="pl-8 bg-white/50 border-slate-200 focus:bg-white transition-all rounded-xl"
                    />
                  </div>
                  {errors.selling_price && <p className="text-xs text-red-500">{errors.selling_price}</p>}
                </div>
                
                {/* Assigned User Selection - Hydration Safe Native HTML Select */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Penanggung Jawab</Label>
                  <select
                    value={data.assigned_user_id || ''}
                    onChange={(e) => setData('assigned_user_id', e.target.value)}
                    className="w-full bg-white/50 border border-slate-200 focus:border-primary focus:bg-white rounded-xl h-10 text-xs px-3 outline-none transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Pilih PJ (Internal)</option>
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Foto Item</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setData('image', e.target.files?.[0] || null)}
                    className="bg-white/50 border-slate-200 cursor-pointer transition-all rounded-xl file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  {errors.image && <p className="text-xs text-red-500">{errors.image}</p>}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={processing} className="min-w-[140px] bg-primary hover:bg-primary/90 rounded-xl font-medium shadow-md shadow-primary/20 transition-all">
                  {processing ? (
                    <span className="flex items-center gap-2">Memproses...</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Tambah Item</span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List Section with Grid & List View Toggle */}
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Katalog Inventaris</h3>
              <p className="text-xs text-slate-500">Menampilkan {filteredItems.length} dari total {items.length} item terdaftar.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* View Mode Switcher */}
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50 mr-1 shadow-inner">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className={cn(
                    "rounded-lg px-3 py-1.5 h-8 gap-1.5 text-xs font-semibold transition-all",
                    viewMode === 'card' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-transparent"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Card
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "rounded-lg px-3 py-1.5 h-8 gap-1.5 text-xs font-semibold transition-all",
                    viewMode === 'list' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-transparent"
                  )}
                >
                  <List className="h-3.5 w-3.5" /> List
                </Button>
              </div>

              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Cari item..."
                  className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleSort('name')} className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 gap-1.5">
                  Nama <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSort('current_stock')} className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 gap-1.5">
                  Stok <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Cards or List Grid */}
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-slate-200">
              <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">Tidak ada item ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
            </div>
          ) : viewMode === 'card' ? (
            /* CARD GRID VIEW MODE */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredItems.map((item) => {
                const isEditing = editingId === item.id;

                if (isEditing) {
                  return (
                    <Card key={item.id} className="relative overflow-hidden bg-white border-2 border-primary shadow-xl rounded-2xl flex flex-col h-full ring-2 ring-primary/20 animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between border-b pb-1.5">
                            <span className="text-xs font-bold text-primary flex items-center gap-1">
                              <Pencil className="h-3 w-3" /> EDIT ITEM INLINE
                            </span>
                            <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-600">Nama Item</Label>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-xs rounded-lg"
                              required
                            />
                            {editErrors.name && <p className="text-[9px] text-red-500">{editErrors.name}</p>}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600">Kategori</Label>
                              <Input
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="h-8 text-xs rounded-lg"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600">SKU</Label>
                              <Input
                                value={editSku}
                                placeholder="Auto jika kosong"
                                onChange={(e) => setEditSku(e.target.value)}
                                className="h-8 text-xs rounded-lg font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600">Satuan</Label>
                              <Input
                                value={editUnit}
                                onChange={(e) => setEditUnit(e.target.value)}
                                className="h-8 text-xs rounded-lg"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600">Min Stok Alert</Label>
                              <Input
                                type="number"
                                value={editMinStock}
                                onChange={(e) => setEditMinStock(e.target.value)}
                                className="h-8 text-xs rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600">Harga Jual (Rp)</Label>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">Rp</span>
                                <Input
                                  type="number"
                                  value={editSellingPrice}
                                  onChange={(e) => setEditSellingPrice(e.target.value)}
                                  className="h-8 pl-6 text-xs rounded-lg"
                                />
                              </div>
                            </div>
                            
                            {/* PJ Input - Hydration Safe Native HTML Select */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-slate-600">PJ (Internal)</Label>
                              <select
                                value={editAssignedUserId}
                                onChange={(e) => setEditAssignedUserId(e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:border-primary rounded-lg h-8 text-xs px-2 outline-none transition-all cursor-pointer appearance-none"
                              >
                                <option value="">Tanpa PJ</option>
                                {staffUsers.map((u) => (
                                  <option key={u.id} value={u.id.toString()}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-slate-600">Update Foto</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                              className="h-8 text-xs rounded-lg file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-primary/10 file:text-primary cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 mt-auto border-t">
                          <Button size="sm" variant="ghost" onClick={cancelEditing} className="flex-1 rounded-xl hover:bg-slate-50 text-slate-500 text-xs h-8">
                            Batal
                          </Button>
                          <Button size="sm" disabled={isUpdating} onClick={() => handleUpdateSubmit(item.id)} className="flex-1 rounded-xl bg-primary text-white text-xs gap-1 h-8">
                            <Save className="h-3.5 w-3.5" /> Simpan
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card key={item.id} className="relative overflow-hidden bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-100 hover:border-slate-200 shadow-md hover:shadow-xl rounded-2xl flex flex-col h-full group transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative h-44 w-full bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-150">
                      {item.image_path ? (
                        <img
                          src={`/storage/${item.image_path}`}
                          alt={item.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-slate-400">
                          <Package className="h-10 w-10 stroke-[1.5]" />
                          <span className="text-[10px] uppercase font-semibold tracking-wider">No Image</span>
                        </div>
                      )}
                      
                      {item.is_below_min && (
                        <Badge variant="destructive" className="absolute top-3 right-3 shadow-md shadow-red-500/20 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full animate-pulse">
                          Low Stock
                        </Badge>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <Layers className="h-3 w-3" />
                            <span>{item.category || 'Tanpa Kategori'}</span>
                          </div>
                          
                          {/* Display PJ / Assigned User */}
                          {item.assigned_user && (
                            <Badge variant="outline" className="text-[9px] font-semibold bg-blue-50/50 text-blue-700 border-blue-100/50 py-0 h-4 flex items-center gap-0.5">
                              <UserCheck className="w-2.5 h-2.5" /> {item.assigned_user.name}
                            </Badge>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-800 text-base leading-snug group-hover:text-primary transition-colors line-clamp-2" title={item.name}>
                          {item.name}
                        </h4>

                        <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md w-max border border-slate-100">
                          <Tag className="h-3 w-3" />
                          <span>{item.sku || '-'}</span>
                        </div>
                      </div>

                      <Separator className="bg-slate-100" />

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stok Aktual</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className={cn(
                              "text-xl font-black",
                              item.is_below_min ? "text-red-500" : "text-green-600"
                            )}>
                              {Number(item.current_stock)}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">{item.unit}</span>
                          </div>
                        </div>
                        <div className="flex flex-col border-l border-slate-100 pl-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
                            <Coins className="h-3 w-3" /> Harga Jual
                          </span>
                          <span className="text-sm font-bold text-slate-700 mt-1 truncate" title={formatRupiah(item.selling_price)}>
                            {formatRupiah(item.selling_price)}
                          </span>
                        </div>
                      </div>

                      <Separator className="bg-slate-100" />

                      <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                        <span>Min. Stok: {Number(item.min_stock)} {item.unit}</span>
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                            onClick={() => startEditing(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                            onClick={() => initiateDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW MODE GROUPED BY UNIT & SORTED BY STOCK LEVEL */
            <div className="flex flex-col gap-8">
              {Object.entries(groupedByUnit).map(([unit, itemsInUnit]) => (
                <div key={unit} className="space-y-4">
                  {/* Group header */}
                  <div className="flex items-center gap-3 px-1">
                    <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 font-bold px-3 py-1 text-xs tracking-wider">
                      Satuan: {unit} ({itemsInUnit.length} Item)
                    </Badge>
                    <div className="h-[1.5px] bg-slate-100/80 flex-1"></div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {itemsInUnit.map((item) => {
                      const isEditing = editingId === item.id;

                      if (isEditing) {
                        return (
                          <Card key={item.id} className="relative overflow-hidden bg-white border-2 border-primary shadow-xl rounded-2xl flex flex-col sm:flex-row h-full ring-2 ring-primary/20 animate-in fade-in slide-in-from-bottom duration-250">
                            {/* Left: Large Image */}
                            <div className="relative h-44 sm:h-auto w-full sm:w-48 bg-slate-150 overflow-hidden flex items-center justify-center shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200">
                              {item.image_path ? (
                                <img
                                  src={`/storage/${item.image_path}`}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                                  <Package className="h-10 w-10 stroke-[1.5]" />
                                </div>
                              )}
                            </div>

                            {/* Right: Form Inputs */}
                            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                              <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-xs font-bold text-primary flex items-center gap-1">
                                  <Pencil className="h-3 w-3" /> EDIT ITEM INLINE (LIST)
                                </span>
                                <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 transition-colors">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-600">Nama Item</Label>
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-8 text-sm rounded-lg"
                                    required
                                  />
                                  {editErrors.name && <p className="text-[10px] text-red-500">{editErrors.name}</p>}
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-600">Kategori</Label>
                                  <Input
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="h-8 text-sm rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-600">SKU</Label>
                                  <Input
                                    value={editSku}
                                    placeholder="Auto jika kosong"
                                    onChange={(e) => setEditSku(e.target.value)}
                                    className="h-8 text-xs rounded-lg font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-600">Satuan</Label>
                                  <Input
                                    value={editUnit}
                                    onChange={(e) => setEditUnit(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-600">Min Stok Alert</Label>
                                  <Input
                                    type="number"
                                    value={editMinStock}
                                    onChange={(e) => setEditMinStock(e.target.value)}
                                    className="h-8 text-xs rounded-lg"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-600">Harga Jual (Rp)</Label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                                    <Input
                                      type="number"
                                      value={editSellingPrice}
                                      onChange={(e) => setEditSellingPrice(e.target.value)}
                                      className="h-8 pl-7 text-xs rounded-lg"
                                    />
                                  </div>
                                </div>

                                {/* PJ Input - Hydration Safe Native HTML Select */}
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-600">PJ (Internal)</Label>
                                  <select
                                    value={editAssignedUserId}
                                    onChange={(e) => setEditAssignedUserId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 focus:border-primary rounded-lg h-8 text-xs px-2 outline-none transition-all cursor-pointer appearance-none"
                                  >
                                    <option value="">Tanpa PJ</option>
                                    {staffUsers.map((u) => (
                                      <option key={u.id} value={u.id.toString()}>
                                        {u.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2">
                                <div className="space-y-1">
                                  <Label className="text-xs font-semibold text-slate-600">Update Foto</Label>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                                    className="h-8 text-xs rounded-lg file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-primary/10 file:text-primary cursor-pointer"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="ghost" onClick={cancelEditing} className="rounded-xl hover:bg-slate-50 text-slate-500 text-xs px-4">
                                    Batal
                                  </Button>
                                  <Button size="sm" disabled={isUpdating} onClick={() => handleUpdateSubmit(item.id)} className="rounded-xl bg-primary text-white text-xs gap-1 px-4 h-8">
                                    <Save className="h-3.5 w-3.5" /> Simpan
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      }

                      return (
                        <Card key={item.id} className="relative overflow-hidden bg-white/80 hover:bg-white backdrop-blur-sm border border-slate-100 hover:border-slate-200 shadow-md hover:shadow-lg rounded-2xl flex flex-col sm:flex-row group transition-all duration-300 animate-in fade-in slide-in-from-bottom duration-200">
                          {/* Left: Large Photo */}
                          <div className="relative h-44 sm:h-auto w-full sm:w-48 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border-b sm:border-b-0 sm:border-r border-slate-150">
                            {item.image_path ? (
                              <img
                                src={`/storage/${item.image_path}`}
                                alt={item.name}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1.5 text-slate-400">
                                <Package className="h-10 w-10 stroke-[1.5]" />
                                <span className="text-[10px] uppercase font-semibold tracking-wider">No Image</span>
                              </div>
                            )}
                            
                            {item.is_below_min && (
                              <Badge variant="destructive" className="absolute top-3 right-3 shadow-md shadow-red-500/20 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full animate-pulse">
                                Low Stock
                              </Badge>
                            )}
                          </div>

                          {/* Right: Details */}
                          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  <Layers className="h-3 w-3" />
                                  <span>{item.category || 'Tanpa Kategori'}</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg leading-snug group-hover:text-primary transition-colors">
                                  {item.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md w-max border border-slate-100">
                                    <Tag className="h-3 w-3" />
                                    <span>{item.sku || '-'}</span>
                                  </div>
                                  
                                  {/* Assigned User PJ Label */}
                                  {item.assigned_user && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500 bg-blue-50/50 text-blue-700 px-2 py-0.5 rounded-md w-max border border-blue-100/30">
                                      <span className="font-bold text-blue-500">PJ:</span>
                                      <span>{item.assigned_user.name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-1.5 self-end sm:self-start">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                                  onClick={() => startEditing(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                  onClick={() => initiateDelete(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stok Aktual</span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                  <span className={cn(
                                    "text-xl font-black",
                                    item.is_below_min ? "text-red-500" : "text-green-600"
                                  )}>
                                    {Number(item.current_stock)}
                                  </span>
                                  <span className="text-xs text-slate-500 font-semibold">{item.unit}</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col border-l border-slate-100 pl-6">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
                                  <Coins className="h-3 w-3" /> Harga Jual
                                </span>
                                <span className="text-base font-bold text-slate-700 mt-0.5">
                                  {formatRupiah(item.selling_price)}
                                </span>
                              </div>

                              <div className="flex flex-col border-l border-slate-100 pl-6">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batas Minimal</span>
                                <span className="text-sm font-semibold text-slate-500 mt-0.5">
                                  {Number(item.min_stock)} {item.unit}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Dialog delete */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Konfirmasi Hapus Item</DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus item <span className="font-semibold text-slate-700">"{itemToDelete?.name}"</span>?
              <br /><br />
              <span className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs block border border-amber-200/50 text-left">
                <strong>Pemberitahuan:</strong> Item yang memiliki riwayat stock movement atau usage tidak bisa dihapus permanen untuk integritas data keuangan, namun Anda dapat menonaktifkan item tersebut.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl border-slate-200">
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="rounded-xl">
              Hapus Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
