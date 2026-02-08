export type AppRole = 'admin' | 'supplier' | 'pharmacist';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  supplier: 'Supplier',
  pharmacist: 'Pharmacist',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive',
  supplier: 'bg-primary/10 text-primary',
  pharmacist: 'bg-success/10 text-green-700',
};
