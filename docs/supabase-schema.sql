-- Run this entire file in your Supabase SQL editor

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  tier text default 'free' check (tier in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- Day trading journal
create table public.trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ticker text not null,
  direction text check (direction in ('LONG', 'SHORT')),
  entry numeric not null,
  exit numeric,
  qty numeric not null,
  setup text,
  status text default 'open' check (status in ('open', 'win', 'loss', 'be')),
  pnl numeric default 0,
  notes text,
  created_at timestamptz default now()
);

-- Sports bets journal
create table public.bets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  sport text check (sport in ('NFL', 'NBA', 'MLB', 'Soccer', 'UFC')),
  type text,
  match text not null,
  odds text not null,
  stake numeric not null,
  to_win numeric,
  result text default 'pending' check (result in ('pending', 'win', 'loss', 'push')),
  pnl numeric,
  notes text,
  created_at timestamptz default now()
);

-- AI usage tracking (for free tier daily limits)
create table public.ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- Row Level Security — users can only see their own data
alter table public.profiles enable row level security;
alter table public.trades   enable row level security;
alter table public.bets     enable row level security;
alter table public.ai_usage enable row level security;

create policy "Users see own profile" on public.profiles for all using (auth.uid() = id);
create policy "Users see own trades"  on public.trades   for all using (auth.uid() = user_id);
create policy "Users see own bets"    on public.bets     for all using (auth.uid() = user_id);
create policy "Users see own usage"   on public.ai_usage for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance
create index trades_user_id_idx  on public.trades(user_id);
create index bets_user_id_idx    on public.bets(user_id);
create index ai_usage_user_date  on public.ai_usage(user_id, created_at);
