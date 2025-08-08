import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, Loader2 } from 'lucide-react';

const Confirm = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const user = session?.user ?? null;
      setEmail(user?.email ?? null);
      setConfirmed(!!user?.email_confirmed_at);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setEmail(user?.email ?? null);
      setConfirmed(!!user?.email_confirmed_at);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const redirectTo = `${window.location.origin}/confirm`;
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } });
      if (error) toast({ title: 'Resend failed', description: error.message, variant: 'destructive' });
      else toast({ title: 'Email sent', description: 'Check your inbox for the verification link.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <section className="w-full max-w-md bg-gradient-card p-8 rounded-2xl shadow-card border border-border text-center">
        {confirmed ? (
          <div>
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-glow mb-4">
              <CheckCircle className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Aboard!</h1>
            <p className="text-muted-foreground">Your email has been confirmed. You can now submit leads.</p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Confirm your email</h1>
            <p className="text-muted-foreground mb-6">We sent a verification link to {email ?? 'your email'}.</p>
            <Button onClick={resend} disabled={resending}>
              {resending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {resending ? 'Sending...' : 'Resend Email'}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
};

export default Confirm;
