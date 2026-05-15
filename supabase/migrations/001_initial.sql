-- Profiles (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Homes
create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Home members
create table if not exists public.home_members (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(home_id, user_id)
);

-- Invitations
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  email text not null,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.invitations enable row level security;

-- Profiles policies
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can read profiles of housemates"
  on public.profiles for select
  using (
    exists (
      select 1 from public.home_members hm1
      join public.home_members hm2 on hm1.home_id = hm2.home_id
      where hm1.user_id = auth.uid() and hm2.user_id = profiles.id
    )
  );

-- Homes policies
create policy "Home members can read their home"
  on public.homes for select
  using (
    exists (
      select 1 from public.home_members
      where home_id = homes.id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create homes"
  on public.homes for insert
  with check (auth.uid() = created_by);

-- Home members policies
create policy "Users can read their own memberships"
  on public.home_members for select
  using (user_id = auth.uid());

create policy "Home members can read all members of their home"
  on public.home_members for select
  using (
    exists (
      select 1 from public.home_members hm
      where hm.home_id = home_members.home_id and hm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can insert home members"
  on public.home_members for insert
  with check (auth.role() = 'authenticated');

-- Invitations policies
create policy "Home members can read invitations"
  on public.invitations for select
  using (
    exists (
      select 1 from public.home_members
      where home_id = invitations.home_id and user_id = auth.uid()
    )
  );

create policy "Anyone can read invitations by email"
  on public.invitations for select
  using (email = (select email from public.profiles where id = auth.uid()));

create policy "Home members can insert invitations"
  on public.invitations for insert
  with check (
    exists (
      select 1 from public.home_members
      where home_id = invitations.home_id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can update invitations"
  on public.invitations for update
  using (auth.role() = 'authenticated');

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
