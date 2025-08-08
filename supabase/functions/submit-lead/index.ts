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

interface SubmitLeadRequest {
  name: string;
  email: string;
  industry: string;
  redirect_to?: string;
}

const projectRef = "grpzvouozarfociweami";

function buildConfirmUrl(token: string, redirectTo?: string) {
  const base = `https://${projectRef}.functions.supabase.co/confirm-lead`;
  const params = new URLSearchParams({ token });
  if (redirectTo) params.set("redirect", redirectTo);
  return `${base}?${params.toString()}`;
}

const COOLDOWN_MS = 2 * 60 * 1000;

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    try {
      const contentType = (req.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        return new Response(JSON.stringify({ error: "Unsupported content type" }), { status: 415, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

    const { name, email, industry, redirect_to }: SubmitLeadRequest = await req.json();

    // Basic validation
    const trimmedName = (name || "").trim();
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedIndustry = (industry || "").trim();
    if (!trimmedName || !trimmedEmail || !trimmedIndustry || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Generate token with collision retry and upsert lead
    let token = crypto.randomUUID();

    // Upsert: if an unconfirmed lead with same email exists, update it; else insert new.
    const { data: existing, error: findErr } = await supabase
      .from("leads")
      .select("id, is_email_confirmed, last_confirmation_sent_at, confirmation_token")
      .eq("email", trimmedEmail)
      .limit(1)
      .maybeSingle();
    if (findErr) throw findErr;

    const MAX_RETRIES = 5;

    let shouldSend = true;

    if (!existing) {
      let success = false;
      for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
        const { error: insertErr } = await supabase.from("leads").insert({
          name: trimmedName,
          email: trimmedEmail,
          industry: trimmedIndustry,
          is_email_confirmed: false,
          confirmation_token: token,
          confirmation_sent_at: new Date().toISOString(),
          last_confirmation_sent_at: new Date().toISOString(),
        });
        if (!insertErr) {
          success = true;
          break;
        }
        // Retry on unique violation for confirmation_token
        // @ts-ignore - edge function error objects may include 'code'
        if (insertErr.code === "23505") {
          token = crypto.randomUUID();
          continue;
        }
        throw insertErr;
      }
      if (!success) throw new Error("Failed to insert lead after retries");
    } else if (existing.is_email_confirmed) {
      // If already confirmed, respond generically to avoid enumeration
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    } else {
      // Apply cooldown to prevent spamming and email enumeration
      const lastSentAt = (existing as any).last_confirmation_sent_at ? new Date((existing as any).last_confirmation_sent_at) : null;
      if (lastSentAt && Date.now() - lastSentAt.getTime() < COOLDOWN_MS) {
        shouldSend = false;
      }

      if (shouldSend) {
        let success = false;
        for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
          const { error: updateErr } = await supabase
            .from("leads")
            .update({
              name: trimmedName,
              industry: trimmedIndustry,
              confirmation_token: token,
              last_confirmation_sent_at: new Date().toISOString(),
            })
            .eq("email", trimmedEmail);
          if (!updateErr) {
            success = true;
            break;
          }
          // @ts-ignore
          if (updateErr.code === "23505") {
            token = crypto.randomUUID();
            continue;
          }
          throw updateErr;
        }
        if (!success) throw new Error("Failed to update lead after retries");
      }
    }

    if (shouldSend) {
      const confirmUrl = buildConfirmUrl(token, redirect_to);

      const safeName = escapeHtml(trimmedName);
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Confirm your email</h1>
          <p>Hi ${safeName}, thanks for joining! Please confirm your email to get started.</p>
          <p><a href="${confirmUrl}" style="background:#4f46e5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Confirm Email</a></p>
          <p style="color:#666">If the button doesn't work, copy and paste this link:</p>
          <code style="display:block;padding:12px;background:#f4f4f5;border-radius:6px;color:#111">${confirmUrl}</code>
        </div>
      `;

      const emailResponse = await resend.emails.send({
        from: "Your App <onboarding@resend.dev>",
        to: [trimmedEmail],
        subject: "Please confirm your email",
        html,
      });

      console.log("Confirmation email sent:", emailResponse);
    } else {
      console.log("Skipped sending confirmation email due to cooldown or already confirmed");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } // end try
  catch (error: any) {
    console.error("Error in submit-lead:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
