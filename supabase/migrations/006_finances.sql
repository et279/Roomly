-- ============================================================
-- 006_finances.sql — Módulo Finanzas del Hogar
-- Tablas nuevas. No modifica tablas existentes.
-- ============================================================

-- Categorías de gasto personalizadas por hogar
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  name text not null,
  icon text not null default 'circle',
  color text not null default '#94a3b8',
  created_at timestamptz default now()
);

-- Registro financiero central (ingresos, gastos, ahorros, etc.)
create table if not exists public.financial_records (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'saving', 'transfer', 'adjustment')),
  amount numeric(12,2) not null check (amount > 0),
  category_id uuid references public.expense_categories(id) on delete set null,
  description text,
  date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cuotas y aportes mensuales de usuarios
create table if not exists public.house_contributions (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  status text not null default 'pending' check (status in ('paid', 'partial', 'pending', 'overdue')),
  due_date date not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Metas de ahorro compartidas
create table if not exists public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  deadline date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.expense_categories enable row level security;
alter table public.financial_records enable row level security;
alter table public.house_contributions enable row level security;
alter table public.saving_goals enable row level security;

-- expense_categories policies
create policy "Home members can read categories"
  on public.expense_categories for select
  using (
    exists (
      select 1 from public.home_members
      where home_id = expense_categories.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can insert categories"
  on public.expense_categories for insert
  with check (
    exists (
      select 1 from public.home_members
      where home_id = expense_categories.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can update categories"
  on public.expense_categories for update
  using (
    exists (
      select 1 from public.home_members
      where home_id = expense_categories.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can delete categories"
  on public.expense_categories for delete
  using (
    exists (
      select 1 from public.home_members
      where home_id = expense_categories.home_id and user_id = auth.uid()
    )
  );

-- financial_records policies
create policy "Home members can read financial records"
  on public.financial_records for select
  using (
    exists (
      select 1 from public.home_members
      where home_id = financial_records.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can insert financial records"
  on public.financial_records for insert
  with check (
    exists (
      select 1 from public.home_members
      where home_id = financial_records.home_id and user_id = auth.uid()
    )
  );

create policy "Users can update own financial records"
  on public.financial_records for update
  using (user_id = auth.uid());

create policy "Users can delete own financial records"
  on public.financial_records for delete
  using (user_id = auth.uid());

-- house_contributions policies
create policy "Home members can read contributions"
  on public.house_contributions for select
  using (
    exists (
      select 1 from public.home_members
      where home_id = house_contributions.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can insert contributions"
  on public.house_contributions for insert
  with check (
    exists (
      select 1 from public.home_members
      where home_id = house_contributions.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can update contributions"
  on public.house_contributions for update
  using (
    exists (
      select 1 from public.home_members
      where home_id = house_contributions.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can delete contributions"
  on public.house_contributions for delete
  using (
    exists (
      select 1 from public.home_members
      where home_id = house_contributions.home_id and user_id = auth.uid()
    )
  );

-- saving_goals policies
create policy "Home members can read saving goals"
  on public.saving_goals for select
  using (
    exists (
      select 1 from public.home_members
      where home_id = saving_goals.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can insert saving goals"
  on public.saving_goals for insert
  with check (
    exists (
      select 1 from public.home_members
      where home_id = saving_goals.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can update saving goals"
  on public.saving_goals for update
  using (
    exists (
      select 1 from public.home_members
      where home_id = saving_goals.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can delete saving goals"
  on public.saving_goals for delete
  using (
    exists (
      select 1 from public.home_members
      where home_id = saving_goals.home_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- Índices
-- ============================================================

create index if not exists idx_financial_records_home_id on public.financial_records(home_id);
create index if not exists idx_financial_records_home_date on public.financial_records(home_id, date);
create index if not exists idx_house_contributions_home_id on public.house_contributions(home_id);
create index if not exists idx_house_contributions_due_date on public.house_contributions(home_id, due_date);
create index if not exists idx_saving_goals_home_id on public.saving_goals(home_id);
create index if not exists idx_expense_categories_home_id on public.expense_categories(home_id);
