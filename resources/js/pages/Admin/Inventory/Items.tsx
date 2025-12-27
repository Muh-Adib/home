import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Trash2, ArrowUpDown, Search, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface Item {
  id: number;
  name: string;
  sku: string | null;
  unit: string;
  min_stock: number;
  category: string | null;
  image_path: string | null;
  current_stock: number;
  is_below_min: boolean;
}

interface ItemsProps {
  items: Item[]; // Changed from paginator to array
}

export default function Items({ items }: ItemsProps) {
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');

  const { data, setData, post, processing, reset, errors } = useForm({
    name: '',
    sku: '',
    unit: 'pcs',
    min_stock: '',
    category: '',
    image: null as File | null,
  });

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    // Trigger server-side sort
    router.get('/admin/inventory/items', {
      sort: key,
      direction: direction
    }, {
      preserveState: true,
      preserveScroll: true,
      only: ['items']
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== null && v !== undefined) formData.append(k, v as any);
    });

    if (isEditMode && editingItem) {
      formData.append('_method', 'PUT');
      router.post(`/admin/inventory/items/${editingItem.id}`, formData, {
        forceFormData: true,
        onSuccess: () => {
          reset();
          setIsEditMode(false);
          setEditingItem(null);
          router.reload();
        },
      });
    } else {
      router.post('/admin/inventory/items', formData, {
        forceFormData: true,
        onSuccess: () => {
          reset();
          setIsEditMode(false);
          setEditingItem(null);
        },
      });
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setIsEditMode(true);
    setData({
      name: item.name,
      sku: item.sku || '',
      unit: item.unit,
      min_stock: String(item.min_stock || 0),
      category: item.category || '',
      image: null,
    });
  };

  const handleDelete = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
    // Use Inertia delete method directly inside the confirm handler for simplicity here
  };

  // Custom delete hook usage wasn't standard, implementing direct call
  const { delete: destroy } = useForm();

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

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditingItem(null);
    reset();
  };

  // Filter items client-side for immediate search feedback if list is loaded
  // Although server-side search is better for large datasets, user asked to remove pagination implicitly suggesting loading all.
  // We can filter the `items` prop.
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AdminLayout title="Inventaris" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Inventory', href: '/admin/inventory/items' }]}>
      <div className="flex flex-col gap-6">

        {/* Form Section */}
        <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {isEditMode ? 'Edit Item' : 'Tambah Item Baru'}
                </CardTitle>
                <CardDescription>
                  {isEditMode ? 'Perbarui informasi item inventaris.' : 'Tambahkan item baru ke dalam inventaris sistem.'}
                </CardDescription>
              </div>
              {isEditMode && (
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  Batal Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Item</Label>
                  <Input
                    placeholder="Contoh: Sabun Cuci Tangan"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    required
                    className="bg-background/50"
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Input
                    placeholder="Contoh: Kebersihan"
                    value={data.category}
                    onChange={(e) => setData('category', e.target.value)}
                    className="bg-background/50"
                  />
                  {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    placeholder="Optional"
                    value={data.sku}
                    onChange={(e) => setData('sku', e.target.value)}
                    className="bg-background/50"
                  />
                  {errors.sku && <p className="text-sm text-red-500">{errors.sku}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Satuan</Label>
                  <Input
                    placeholder="pcs, box, ltr"
                    value={data.unit}
                    onChange={(e) => setData('unit', e.target.value)}
                    required
                    className="bg-background/50"
                  />
                  {errors.unit && <p className="text-sm text-red-500">{errors.unit}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Min. Stok Alert</Label>
                  <Input
                    type="number"
                    step="1"
                    value={data.min_stock}
                    onChange={(e) => setData('min_stock', e.target.value)}
                    className="bg-background/50"
                  />
                  {errors.min_stock && <p className="text-sm text-red-500">{errors.min_stock}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foto Item</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setData('image', e.target.files?.[0] || null)}
                    className="cursopointer bg-background/50 file:text-primary"
                  />
                  {isEditMode && editingItem?.image_path && (
                    <div className="relative h-10 w-10 rounded overflow-hidden border">
                      <img src={`/storage/${editingItem.image_path}`} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
                {errors.image && <p className="text-sm text-red-500">{errors.image}</p>}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={processing} className="min-w-[120px]">
                  {processing ? (
                    <span className="flex items-center gap-2">Processing...</span>
                  ) : (
                    isEditMode ? 'Simpan Perubahan' : 'Simpan Item Baru'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List Section */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col h-full bg-white/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Daftar Inventory</CardTitle>
                <CardDescription>Total {items.length} item terdaftar dalam sistem.</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari item..."
                  className="pl-9 bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <Separator />
          <div className="flex-1 overflow-auto max-h-[600px]">
            <table className="w-full text-sm item-table">
              <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b shadow-sm">
                <tr className="text-left text-muted-foreground font-medium">
                  <th className="py-3 px-4 w-[80px]">Foto</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Item <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1">Kategori <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('sku')}>
                    <div className="flex items-center gap-1">SKU <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('current_stock')}>
                    <div className="flex items-center justify-center gap-1">Stok Aktual <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('min_stock')}>
                    <div className="flex items-center justify-center gap-1">Min. Stok <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Tidak ada item yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="py-3 px-4">
                        {item.image_path ? (
                          <div className="h-10 w-10 rounded-lg overflow-hidden border shadow-sm group-hover:scale-105 transition-transform">
                            <img src={`/storage/${item.image_path}`} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
                            <Package className="h-5 w-5 opacity-50" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.unit}</div>
                      </td>
                      <td className="py-3 px-4">
                        {item.category ? (
                          <Badge variant="outline" className="font-normal">{item.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {item.sku || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            "font-bold text-base",
                            item.is_below_min ? "text-red-500" : "text-green-600"
                          )}>
                            {Number(item.current_stock)}
                          </span>
                          {item.is_below_min && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 mt-1">Low Stock</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">
                        {Number(item.min_stock)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-muted/20 border-t text-xs text-muted-foreground flex justify-between items-center">
            <span>Menampilkan {filteredItems.length} items</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Stok Aman</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Stok Menipis</span>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Penghapusan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus item <span className="font-bold text-foreground">"{itemToDelete?.name}"</span>?
              <br /><br />
              <span className="p-2 bg-yellow-100 text-yellow-800 rounded text-xs block border border-yellow-200">
                ⚠️ Item yang memiliki riwayat penggunaan tidak dapat dihapus permanen, namun akan dinonaktifkan.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Hapus Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}


