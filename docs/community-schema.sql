-- Run this in Supabase SQL Editor after the main schema

-- Community posts
create table public.posts (
  id          uuid default gen_random_uuid() primary key,
  channel     text check (channel in ('trading','polymarket','betting','news')) not null,
  display_name text not null,
  user_id     uuid references public.profiles(id) on delete set null,
  device_id   text,
  content     text not null,
  upvotes     integer default 0 not null,
  reply_count integer default 0 not null,
  is_flagged  boolean default false not null,
  created_at  timestamptz default now()
);

-- Community replies
create table public.replies (
  id           uuid default gen_random_uuid() primary key,
  post_id      uuid references public.posts(id) on delete cascade not null,
  display_name text not null,
  user_id      uuid references public.profiles(id) on delete set null,
  content      text not null,
  upvotes      integer default 0 not null,
  created_at   timestamptz default now()
);

-- Post reports for moderation
create table public.post_reports (
  id        uuid default gen_random_uuid() primary key,
  post_id   uuid references public.posts(id) on delete cascade,
  reply_id  uuid references public.replies(id) on delete cascade,
  reason    text default 'inappropriate',
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.posts        enable row level security;
alter table public.replies      enable row level security;
alter table public.post_reports enable row level security;

-- Anyone can read unflagged posts
create policy "Public read posts"    on public.posts    for select using (not is_flagged);
create policy "Public insert posts"  on public.posts    for insert with check (true);
create policy "Public read replies"  on public.replies  for select using (true);
create policy "Public insert replies" on public.replies for insert with check (true);
create policy "Public insert reports" on public.post_reports for insert with check (true);

-- Indexes
create index posts_channel_time_idx on public.posts(channel, created_at desc);
create index posts_upvotes_idx      on public.posts(upvotes desc, created_at desc);
create index replies_post_idx       on public.replies(post_id, created_at asc);

-- Atomic counter functions (avoids race conditions)
create or replace function increment_post_upvotes(post_id uuid)
returns void language sql security definer as $$
  update public.posts set upvotes = upvotes + 1 where id = post_id;
$$;

create or replace function increment_reply_upvotes(reply_id uuid)
returns void language sql security definer as $$
  update public.replies set upvotes = upvotes + 1 where id = reply_id;
$$;

create or replace function increment_reply_count(post_id uuid)
returns void language sql security definer as $$
  update public.posts set reply_count = reply_count + 1 where id = post_id;
$$;
