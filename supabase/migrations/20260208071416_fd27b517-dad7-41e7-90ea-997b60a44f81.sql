
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supplier', 'pharmacist');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Medicines table
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  manufacturer TEXT DEFAULT '',
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  supplier_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- 5. Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type TEXT NOT NULL DEFAULT 'purchase' CHECK (order_type IN ('purchase', 'issue')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  supplier_id UUID REFERENCES auth.users(id),
  notes TEXT DEFAULT '',
  total_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES public.medicines(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 7. Helper function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 8. Trigger for auto-creating profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 10. RLS Policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System creates profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User Roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Medicines
CREATE POLICY "Authenticated users with roles can view medicines" ON public.medicines FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supplier') OR public.has_role(auth.uid(), 'pharmacist')
);
CREATE POLICY "Admin and supplier can insert medicines" ON public.medicines FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supplier')
);
CREATE POLICY "Admin and supplier can update medicines" ON public.medicines FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supplier')
);
CREATE POLICY "Admin can delete medicines" ON public.medicines FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);

-- Orders
CREATE POLICY "Users can view relevant orders" ON public.orders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR created_by = auth.uid() OR supplier_id = auth.uid()
);
CREATE POLICY "Supplier and pharmacist can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (
  (public.has_role(auth.uid(), 'supplier') OR public.has_role(auth.uid(), 'pharmacist')) AND created_by = auth.uid()
);
CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR (created_by = auth.uid() AND status != 'delivered')
);
CREATE POLICY "Admin can delete orders" ON public.orders FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);

-- Order Items
CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND (orders.created_by = auth.uid() OR orders.supplier_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.created_by = auth.uid())
);
CREATE POLICY "Users can update order items" ON public.order_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND (orders.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')) AND orders.status != 'delivered')
);
CREATE POLICY "Admin can delete order items" ON public.order_items FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);
