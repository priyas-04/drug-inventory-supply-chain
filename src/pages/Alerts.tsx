import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Package } from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  batch_no: string;
  quantity: number;
  reorder_level: number;
  expiry_date: string;
}

export default function Alerts() {
  const [lowStock, setLowStock] = useState<Medicine[]>([]);
  const [expiring, setExpiring] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    const { data } = await supabase.from('medicines').select('*');
    const meds = data ?? [];
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    setLowStock(meds.filter(m => m.quantity <= m.reorder_level));
    setExpiring(meds.filter(m => new Date(m.expiry_date) <= thirtyDays));
    setLoading(false);
  };

  const daysUntilExpiry = (date: string) => {
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">Stock and expiry notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-warning" />
              Low Stock ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">All items are well-stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map(med => (
                  <div key={med.id} className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5">
                    <div>
                      <p className="font-medium text-sm">{med.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{med.batch_no}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-warning">{med.quantity} left</p>
                      <p className="text-xs text-muted-foreground">Reorder: {med.reorder_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-destructive" />
              Expiring Soon ({expiring.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiring.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No items expiring within 30 days</p>
            ) : (
              <div className="space-y-3">
                {expiring.map(med => {
                  const days = daysUntilExpiry(med.expiry_date);
                  const isExpired = days <= 0;
                  return (
                    <div key={med.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                      <div>
                        <p className="font-medium text-sm">{med.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{med.batch_no}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={isExpired ? "alert-expiry" : "status-badge alert-expiry"}>
                          {isExpired ? 'Expired' : `${days} days left`}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{med.expiry_date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
