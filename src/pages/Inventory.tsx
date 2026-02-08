import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  batch_no: string;
  category: string;
  manufacturer: string;
  expiry_date: string;
  quantity: number;
  unit_price: number;
  reorder_level: number;
}

const emptyForm = {
  name: '', batch_no: '', category: 'General', manufacturer: '',
  expiry_date: '', quantity: 0, unit_price: 0, reorder_level: 10,
};

export default function Inventory() {
  const { hasRole, user } = useAuth();
  const { toast } = useToast();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const canEdit = hasRole('admin') || hasRole('supplier');

  useEffect(() => { fetchMedicines(); }, []);

  const fetchMedicines = async () => {
    const { data } = await supabase.from('medicines').select('*').order('name');
    setMedicines(data ?? []);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        const { error } = await supabase.from('medicines').update({
          name: form.name, batch_no: form.batch_no, category: form.category,
          manufacturer: form.manufacturer, expiry_date: form.expiry_date,
          quantity: form.quantity, unit_price: form.unit_price, reorder_level: form.reorder_level,
        }).eq('id', editId);
        if (error) throw error;
        toast({ title: 'Medicine updated' });
      } else {
        const { error } = await supabase.from('medicines').insert({
          ...form, supplier_id: user?.id,
        });
        if (error) throw error;
        toast({ title: 'Medicine added' });
      }
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      fetchMedicines();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('medicines').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Medicine deleted' });
      fetchMedicines();
    }
  };

  const openEdit = (med: Medicine) => {
    setForm({
      name: med.name, batch_no: med.batch_no, category: med.category ?? 'General',
      manufacturer: med.manufacturer ?? '', expiry_date: med.expiry_date,
      quantity: med.quantity, unit_price: med.unit_price, reorder_level: med.reorder_level,
    });
    setEditId(med.id);
    setDialogOpen(true);
  };

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.batch_no.toLowerCase().includes(search.toLowerCase()) ||
    (m.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const isExpiringSoon = (date: string) => new Date(date) <= thirtyDays;
  const isLowStock = (qty: number, level: number) => qty <= level;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">{medicines.length} medicines tracked</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Medicine</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? 'Edit Medicine' : 'Add Medicine'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Paracetamol 500mg" />
                </div>
                <div className="space-y-2">
                  <Label>Batch No</Label>
                  <Input value={form.batch_no} onChange={e => setForm({...form, batch_no: e.target.value})} placeholder="BATCH-001" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Analgesic" />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} placeholder="Sun Pharma" />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price (₹)</Label>
                  <Input type="number" step="0.01" value={form.unit_price} onChange={e => setForm({...form, unit_price: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: Number(e.target.value)})} />
                </div>
                <div className="col-span-2">
                  <Button onClick={handleSave} className="w-full">{editId ? 'Update' : 'Add'} Medicine</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search medicines..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                    No medicines found
                  </TableCell>
                </TableRow>
              ) : filtered.map(med => (
                <TableRow key={med.id}>
                  <TableCell className="font-medium">{med.name}</TableCell>
                  <TableCell className="font-mono text-xs">{med.batch_no}</TableCell>
                  <TableCell>{med.category}</TableCell>
                  <TableCell className="text-right font-mono">{med.quantity}</TableCell>
                  <TableCell className="text-right font-mono">₹{Number(med.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs">{med.expiry_date}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isLowStock(med.quantity, med.reorder_level) && (
                        <Badge variant="outline" className="status-badge alert-low-stock text-xs">Low</Badge>
                      )}
                      {isExpiringSoon(med.expiry_date) && (
                        <Badge variant="outline" className="status-badge alert-expiry text-xs">Expiring</Badge>
                      )}
                    </div>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(med)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {hasRole('admin') && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(med.id)} className="hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
