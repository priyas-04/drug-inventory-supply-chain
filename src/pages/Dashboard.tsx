import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, ShoppingCart, AlertTriangle, TrendingUp, Package, Clock } from 'lucide-react';

interface Stats {
  totalMedicines: number;
  lowStock: number;
  expiringCount: number;
  pendingOrders: number;
  totalValue: number;
  recentOrders: any[];
}

export default function Dashboard() {
  const { hasRole } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalMedicines: 0, lowStock: 0, expiringCount: 0, pendingOrders: 0, totalValue: 0, recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [medsRes, ordersRes] = await Promise.all([
        supabase.from('medicines').select('*'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      const meds = medsRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      setStats({
        totalMedicines: meds.length,
        lowStock: meds.filter(m => m.quantity <= m.reorder_level).length,
        expiringCount: meds.filter(m => new Date(m.expiry_date) <= thirtyDays).length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        totalValue: meds.reduce((sum, m) => sum + (m.quantity * Number(m.unit_price)), 0),
        recentOrders: orders,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Medicines', value: stats.totalMedicines, icon: Pill, color: 'text-primary' },
    { label: 'Low Stock Items', value: stats.lowStock, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Expiring Soon', value: stats.expiringCount, icon: Clock, color: 'text-destructive' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: ShoppingCart, color: 'text-primary' },
    { label: 'Inventory Value', value: `₹${stats.totalValue.toLocaleString()}`, icon: TrendingUp, color: 'text-success' },
    { label: 'Total Orders', value: stats.recentOrders.length, icon: Package, color: 'text-muted-foreground' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your drug inventory and supply chain</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium font-mono">{order.id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground capitalize">{order.order_type} order</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">₹{Number(order.total_amount).toLocaleString()}</span>
                    <Badge variant="outline" className={`status-badge status-${order.status}`}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
