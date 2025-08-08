import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tokenParam = url.searchParams.get("token") || url.searchParams.get("t");
    const token = tokenParam?.trim() || null;
    const redirectTo = url.searchParams.get("redirect") || `${url.origin}/lead-confirmed`;

    if (!token) {
      return new Response("Missing token", { status: 400, headers: corsHeaders });
    }

    const { data: lead, error: selErr } = await supabase
      .from("leads")
      .select("id, is_email_confirmed")
      .eq("confirmation_token", token)
      .maybeSingle();

    if (selErr) throw selErr;
    if (!lead) {
      console.log("confirm-lead: token not found or expired", { token });
      return new Response("Invalid or expired token", { status: 400, headers: corsHeaders });
    }

    if (!lead.is_email_confirmed) {
      const { error: updErr } = await supabase
        .from("leads")
        .update({ is_email_confirmed: true, confirmed_at: new Date().toISOString(), confirmation_token: null })
        .eq("id", lead.id);
      if (updErr) throw updErr;
    }

    return new Response(null, { status: 302, headers: { Location: redirectTo, ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in confirm-lead:", error);
    return new Response("Something went wrong", { status: 500, headers: corsHeaders });
  }
});
