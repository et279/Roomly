-- Tasks table (idempotent - may already exist in DB)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  assigned_to uuid references public.profiles(id) on delete set null,
  done boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;

do $$ begin
  create policy "Home members can read tasks"
    on public.tasks for select
    using (
      exists (
        select 1 from public.home_members
        where home_id = tasks.home_id and user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- Metrics columns on tasks
alter table public.tasks
  add column if not exists completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists completed_at timestamptz;

-- Shopping items
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  quantity text,
  added_by uuid references public.profiles(id) on delete set null,
  done boolean not null default false,
  created_at timestamptz default now()
);

alter table public.shopping_items enable row level security;

do $$ begin
  create policy "Home members can read shopping items"
    on public.shopping_items for select
    using (
      exists (
        select 1 from public.home_members
        where home_id = shopping_items.home_id and user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
