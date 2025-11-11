import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

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

export default function Items({ items }: any) {
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data, setData, post, put, delete: deleteItem, processing, reset, errors } = useForm({
    name: '',
    sku: '',
    unit: 'pcs',
    min_stock: '',
    category: '',
    image: null as File | null,
  });

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
        onError: () => {
          // Errors will be handled by Inertia
        },
      });
    } else {
      post('/admin/inventory/items', {
        data: formData,
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
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(`/admin/inventory/items/${itemToDelete.id}`, {
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

  return (
    <AdminLayout title="Inventaris - Items" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Operasional', href: '/admin/inventory/items' }, { title: 'Items' }]}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Item' : 'Tambah Item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div>
                <Label>Nama</Label>
                <Input 
                  value={data.name} 
                  onChange={(e) => setData('name', e.target.value)} 
                  required
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>SKU</Label>
                  <Input value={data.sku} onChange={(e) => setData('sku', e.target.value)} />
                  {errors.sku && <p className="text-sm text-red-500 mt-1">{errors.sku}</p>}
                </div>
                <div>
                  <Label>Satuan</Label>
                  <Input value={data.unit} onChange={(e) => setData('unit', e.target.value)} required />
                  {errors.unit && <p className="text-sm text-red-500 mt-1">{errors.unit}</p>}
                </div>
                <div>
                  <Label>Minimal Stok</Label>
                  <Input type="number" step="0.0001" value={data.min_stock} onChange={(e) => setData('min_stock', e.target.value)} />
                  {errors.min_stock && <p className="text-sm text-red-500 mt-1">{errors.min_stock}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Kategori</Label>
                  <Input value={data.category} onChange={(e) => setData('category', e.target.value)} />
                  {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
                </div>
              </div>
              <div>
                <Label>Foto Item {isEditMode && '(kosongkan jika tidak ingin mengubah)'}</Label>
                <Input type="file" accept="image/*" onChange={(e) => setData('image', e.target.files?.[0] || null)} />
                {errors.image && <p className="text-sm text-red-500 mt-1">{errors.image}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={processing}>
                  {processing ? 'Menyimpan...' : isEditMode ? 'Update' : 'Simpan'}
                </Button>
                {isEditMode && (
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={processing}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daftar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Foto</th>
                    <th className="py-2 pr-4">Nama</th>
                    <th className="py-2 pr-4">SKU</th>
                    <th className="py-2 pr-4">Satuan</th>
                    <th className="py-2 pr-4">Min Stok</th>
                    <th className="py-2 pr-4">Stok</th>
                    <th className="py-2 pr-4">Kategori</th>
                    <th className="py-2 pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.data?.map((it: Item) => (
                    <tr key={it.id} className="border-b">
                      <td className="py-2 pr-4">
                        {it.image_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/storage/${it.image_path}`} alt={it.name} className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <div className="h-10 w-10 bg-muted rounded" />
                        )}
                      </td>
                      <td className="py-2 pr-4">{it.name}</td>
                      <td className="py-2 pr-4">{it.sku || '-'}</td>
                      <td className="py-2 pr-4">{it.unit}</td>
                      <td className="py-2 pr-4">{Number(it.min_stock || 0)}</td>
                      <td className={`py-2 pr-4 ${it.is_below_min ? 'text-red-600 font-semibold' : ''}`}>{Number(it.current_stock || 0)}</td>
                      <td className="py-2 pr-4">{it.category || '-'}</td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(it)}
                            disabled={processing}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(it)}
                            disabled={processing}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div>Menampilkan {items?.from || 0}-{items?.to || 0} dari {items?.total || 0}</div>
              <div className="flex gap-2">
                {items?.links?.map((l: any) => (
                  <Link key={l.label} href={l.url || '#'} className={`px-2 py-1 rounded ${l.active ? 'bg-accent' : 'hover:bg-accent/60'} ${!l.url ? 'pointer-events-none opacity-50' : ''}`}>{l.label.replace('&laquo;','«').replace('&raquo;','»')}</Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Item</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus item "{itemToDelete?.name}"? 
              Tindakan ini tidak dapat dibatalkan. Item yang memiliki riwayat stock movement atau usage tidak dapat dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={processing}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={processing}
            >
              {processing ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}


