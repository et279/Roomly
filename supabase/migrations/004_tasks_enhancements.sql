-- Task enhancements: due date, assignee change tracking, completion tracking
alter table public.tasks
  add column if not exists due_date date,
  add column if not exists original_assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists assignee_changed_by uuid references public.profiles(id) on delete set null,
  add column if not exists assignee_changed_at timestamptz;

-- RLS: update
do $$ begin
  create policy "Home members can update tasks"
    on public.tasks for update
    using (
      exists (
        select 1 from public.home_members
        where home_id = tasks.home_id and user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- RLS: insert
do $$ begin
  create policy "Home members can insert tasks"
    on public.tasks for insert
    with check (
      exists (
        select 1 from public.home_members
        where home_id = tasks.home_id and user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- RLS: delete
do $$ begin
  create policy "Home members can delete tasks"
    on public.tasks for delete
    using (
      exists (
        select 1 from public.home_members
        where home_id = tasks.home_id and user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
