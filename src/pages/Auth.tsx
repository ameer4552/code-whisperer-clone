import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { validateEmail } from '@/lib/validation';
const Auth = () => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {});
    return () => subscription.unsubscribe();
  }, []);

  const emailRedirectTo = `${window.location.origin}/confirm`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic client-side validation to harden the form
    if (!validateEmail(email) || password.length < 8) {
      toast({ title: 'Invalid input', description: 'Enter a valid email and a password with at least 8 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo }
        });
        if (error) throw error;
        toast({ title: 'Check your inbox', description: 'We sent a verification email.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Welcome back', description: 'Logged in successfully.' });
      }
    } catch (err: any) {
      toast({ title: 'Auth error', description: err.message ?? 'Try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <section className="w-full max-w-md bg-gradient-card p-8 rounded-2xl shadow-card border border-border">
        <h1 className="text-2xl font-bold text-foreground mb-2">{mode === 'signup' ? 'Create account' : 'Log in'}</h1>
        <p className="text-muted-foreground mb-6">
          {mode === 'signup' ? 'Sign up to submit leads and get early access.' : 'Enter your credentials.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" placeholder="you@email.com" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" inputMode="email" maxLength={254} />
          <Input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          <Button type="submit" disabled={loading} className="w-full" aria-busy={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {loading ? 'Please wait...' : (mode === 'signup' ? 'Sign up' : 'Log in')}
          </Button>
        </form>
        <div className="text-sm text-muted-foreground mt-4">
          {mode === 'signup' ? (
            <button className="underline" onClick={()=>setMode('login')}>Have an account? Log in</button>
          ) : (
            <button className="underline" onClick={()=>setMode('signup')}>New here? Create account</button>
          )}
        </div>
      </section>
    </main>
  );
};

export default Auth;
