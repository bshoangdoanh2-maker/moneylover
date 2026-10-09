create table if not exists public.finance_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.finance_data enable row level security;

drop policy if exists "Users can read own finance data" on public.finance_data;
drop policy if exists "Users can insert own finance data" on public.finance_data;
drop policy if exists "Users can update own finance data" on public.finance_data;

create policy "Users can read own finance data" on public.finance_data for select using (auth.uid() = user_id);
create policy "Users can insert own finance data" on public.finance_data for insert with check (auth.uid() = user_id);
create policy "Users can update own finance data" on public.finance_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
