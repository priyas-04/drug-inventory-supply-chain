import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Pill, ShoppingCart, Users, LogOut, AlertTriangle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/types/roles';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'supplier', 'pharmacist'] },
  { to: '/inventory', icon: Pill, label: 'Inventory', roles: ['admin', 'supplier', 'pharmacist'] },
  { to: '/orders', icon: ShoppingCart, label: 'Orders', roles: ['admin', 'supplier', 'pharmacist'] },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts', roles: ['admin', 'pharmacist'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
];

export default function AppSidebar() {
  const { user, roles, signOut, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const visibleItems = navItems.filter(item =>
    item.roles.some(r => hasRole(r as any))
  );

  const primaryRole = roles[0];

  return (
    <aside className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Pill className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && <span className="font-bold text-sidebar-foreground">MedTrack</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {visibleItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-2 p-2 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-primary text-xs font-bold shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">
                {primaryRole ? ROLE_LABELS[primaryRole] : 'No role'}
              </p>
            </div>
          )}
          <button onClick={signOut} className="text-sidebar-foreground/50 hover:text-destructive transition-colors shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
