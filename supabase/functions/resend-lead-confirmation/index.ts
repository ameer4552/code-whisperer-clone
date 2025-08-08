import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "");
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, serviceRoleKey);
const projectRef = "grpzvouozarfociweami";

function buildConfirmUrl(token: string, redirectTo?: string) {
  const base = `https://${projectRef}.functions.supabase.co/confirm-lead`;
  const params = new URLSearchParams({ token });
  if (redirectTo) params.set("redirect", redirectTo);
  return `${base}?${params.toString()}`;
}

interface ResendRequest {
  email: string;
  redirect_to?: string;
}

const COOLDOWN_SECONDS = 60; // 1 minute cooldown

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { email, redirect_to }: ResendRequest = await req.json();
    const trimmedEmail = (email || "").trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: lead, error: selErr } = await supabase
      .from('leads')
      .select('id, name, is_email_confirmed, confirmation_sent_at, last_confirmation_sent_at')
      .eq('email', trimmedEmail)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (lead.is_email_confirmed) {
      return new Response(JSON.stringify({ error: 'Already confirmed' }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const last = lead.last_confirmation_sent_at ? new Date(lead.last_confirmation_sent_at) : (lead.confirmation_sent_at ? new Date(lead.confirmation_sent_at) : null);
    if (last) {
      const secondsSince = (Date.now() - last.getTime()) / 1000;
      if (secondsSince < COOLDOWN_SECONDS) {
        return new Response(JSON.stringify({ error: 'Too many requests', retry_after: Math.ceil(COOLDOWN_SECONDS - secondsSince) }), { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    let token = crypto.randomUUID();
    const MAX_RETRIES = 5;
    let success = false;
    for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
      const { error: updErr } = await supabase
        .from('leads')
        .update({ confirmation_token: token, last_confirmation_sent_at: new Date().toISOString() })
        .eq('id', lead.id);
      if (!updErr) {
        success = true;
        break;
      }
      // @ts-ignore - unique violation on confirmation_token
      if (updErr.code === '23505') {
        token = crypto.randomUUID();
        continue;
      }
      throw updErr;
    }
    if (!success) throw new Error('Failed to update token after retries');

    const confirmUrl = buildConfirmUrl(token, redirect_to);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Confirm your email</h1>
        <p>Hi ${lead.name || 'there'}, here is your confirmation link.</p>
        <p><a href="${confirmUrl}" style="background:#4f46e5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Confirm Email</a></p>
        <p style="color:#666">If the button doesn't work, copy and paste this link:</p>
        <code style="display:block;padding:12px;background:#f4f4f5;border-radius:6px;color:#111">${confirmUrl}</code>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: 'Your App <onboarding@resend.dev>',
      to: [trimmedEmail],
      subject: 'Your confirmation link',
      html,
    });

    console.log('Resent confirmation email:', emailResponse);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error('Error in resend-lead-confirmation:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
