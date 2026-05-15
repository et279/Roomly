-- Invite links (token-based, shareable via WhatsApp etc.)
create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

alter table public.invite_links enable row level security;

create policy "Home members can insert invite links"
  on public.invite_links for insert
  with check (
    exists (
      select 1 from public.home_members
      where home_id = invite_links.home_id and user_id = auth.uid()
    )
  );

create policy "Home members can read invite links"
  on public.invite_links for select
  using (
    exists (
      select 1 from public.home_members
      where home_id = invite_links.home_id and user_id = auth.uid()
    )
  );
