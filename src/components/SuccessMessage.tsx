import { CheckCircle, Sparkles, ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeadStore } from '@/lib/lead-store';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const SuccessMessage = () => {
  const { setSubmitted, sessionLeads } = useLeadStore();

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gradient-card p-8 rounded-2xl shadow-card border border-border backdrop-blur-sm animate-slide-up text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-glow animate-glow">
            <CheckCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <Sparkles className="absolute top-0 right-6 w-6 h-6 text-accent animate-bounce" />
          <Sparkles className="absolute bottom-2 left-4 w-4 h-4 text-accent animate-bounce delay-300" />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-3">
          Check your email to confirm
        </h2>
        
        <p className="text-muted-foreground mb-2">
          We’ve sent you a confirmation link. Please click it to complete your signup.
        </p>
        
        <p className="text-sm text-accent mb-8">
          You're #{sessionLeads.length} in this session
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
            <p className="text-sm text-foreground">
              💡 <strong>Didn’t get the email?</strong><br />
              Check your spam folder, or resend the confirmation below.
            </p>
          </div>

          <ResendSection />

          <Button
            onClick={() => setSubmitted(false)}
            variant="outline"
            className="w-full border-border hover:bg-accent/10 transition-smooth group"
          >
            Submit Another Lead
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Follow our journey on social media for real-time updates
          </p>
        </div>
      </div>
    </div>
  );
};

const ResendSection = () => {
  const { sessionLeads } = useLeadStore();
  const latest = sessionLeads[sessionLeads.length - 1];
  const email = latest?.email;
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (!email) return;
    try {
      const { error, data } = await supabase.functions.invoke('resend-lead-confirmation', {
        body: { email, redirect_to: `${window.location.origin}/lead-confirmed` },
      });
      if ((data as any)?.retry_after) {
        setCooldown((data as any).retry_after);
      }
      if (error) throw error;
      toast({ title: 'Email resent', description: `We sent a new confirmation link to ${email}.` });
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
        return () => clearInterval(interval);
      }, 1000);
    } catch (err: any) {
      if (err?.status === 429 && err?.message) {
        toast({ title: 'Please wait', description: err.message, variant: 'destructive' });
      } else {
        toast({ title: 'Failed to resend', description: err?.message || 'Try again later', variant: 'destructive' });
      }
    }
  };

  if (!email) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleResend} disabled={cooldown > 0} className="w-full">
        <Mail className="w-4 h-4 mr-2" />
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Confirmation Email'}
      </Button>
      <p className="text-xs text-muted-foreground">We limit resends to protect against abuse.</p>
    </div>
  );
};