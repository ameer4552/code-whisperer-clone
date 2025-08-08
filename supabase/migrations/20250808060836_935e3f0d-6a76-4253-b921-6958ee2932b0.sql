-- Enable required extension for UUID generation
create extension if not exists pgcrypto;

-- Profiles table to track email confirmation status
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  is_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Basic RLS policies for profiles
create policy if not exists "Profiles are viewable by the owning user" on public.profiles
for select using (auth.uid() = id);

create policy if not exists "Users can insert their own profile" on public.profiles
for insert with check (auth.uid() = id);

create policy if not exists "Users can update their own profile (is_confirmed managed by triggers)" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- Updated at trigger function (shared)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on profiles
create or replace trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Insert a profile automatically when a user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, is_confirmed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name', null),
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep profiles.is_confirmed in sync with auth.users.email_confirmed_at
create or replace function public.sync_profile_confirmation()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles p
    set is_confirmed = (new.email_confirmed_at is not null),
        updated_at = now()
  where p.id = new.id;
  return new;
end;
$$;

create or replace trigger on_auth_user_updated
  after update of email_confirmed_at on auth.users
  for each row execute procedure public.sync_profile_confirmation();

-- Leads table, gated by confirmed users
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  email text not null,
  industry text not null,
  submitted_at timestamptz not null default now(),
  constraint fk_leads_user foreign key (user_id) references auth.users(id) on delete cascade
);

-- Indexes for performance
create index if not exists idx_leads_user_id on public.leads(user_id);
create index if not exists idx_leads_submitted_at on public.leads(submitted_at);

-- Enable RLS on leads
alter table public.leads enable row level security;

-- Policies: users manage only their own leads
create policy if not exists "Users can view their own leads" on public.leads
for select using (auth.uid() = user_id);

create policy if not exists "Users can insert their own leads when confirmed" on public.leads
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_confirmed = true
  )
);

create policy if not exists "Users can update their own leads" on public.leads
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Users can delete their own leads" on public.leads
for delete using (auth.uid() = user_id);
