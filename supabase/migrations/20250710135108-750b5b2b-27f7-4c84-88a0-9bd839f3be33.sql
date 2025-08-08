-- Add industry column to leads table
ALTER TABLE public.leads 
ADD COLUMN industry TEXT NOT NULL DEFAULT 'Other';