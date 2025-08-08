-- Make user_id nullable to allow anonymous leads via edge functions
ALTER TABLE public.leads
  ALTER COLUMN user_id DROP NOT NULL;

-- Add email confirmation fields for lead-only flow
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_email_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmation_token text,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Ensure tokens are unique when present and speed up lookups by email
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_confirmation_token_unique
  ON public.leads(confirmation_token)
  WHERE confirmation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
