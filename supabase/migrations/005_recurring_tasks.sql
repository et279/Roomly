-- Recurring tasks support
alter table public.tasks
  add column if not exists recurrence text default null
    check (recurrence in ('daily', 'weekly', 'biweekly', 'monthly'));
