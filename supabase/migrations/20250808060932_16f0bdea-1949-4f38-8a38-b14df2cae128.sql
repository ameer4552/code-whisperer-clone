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

-- Updated at trigger function (shared)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on profiles
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
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

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
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

-- Policies (created if missing)
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles are viewable by the owning user'
) THEN
  CREATE POLICY "Profiles are viewable by the owning user" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert their own profile'
) THEN
  CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update their own profile (is_confirmed managed by triggers)'
) THEN
  CREATE POLICY "Users can update their own profile (is_confirmed managed by triggers)" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Users can view their own leads'
) THEN
  CREATE POLICY "Users can view their own leads" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Users can insert their own leads when confirmed'
) THEN
  CREATE POLICY "Users can insert their own leads when confirmed" ON public.leads
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_confirmed = true
    )
  );
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Users can update their own leads'
) THEN
  CREATE POLICY "Users can update their own leads" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Users can delete their own leads'
) THEN
  CREATE POLICY "Users can delete their own leads" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
