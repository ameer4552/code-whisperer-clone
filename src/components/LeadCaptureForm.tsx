import { useState, useEffect } from 'react';
import { Mail, User, CheckCircle, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { validateLeadForm, ValidationError } from '@/lib/validation';
import { supabase } from '@/integrations/supabase/client';
import { useLeadStore } from '@/lib/lead-store';
import { useToast } from '@/components/ui/use-toast';

export const LeadCaptureForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', industry: '' });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [showExistsDialog, setShowExistsDialog] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { setSubmitted, addLead, sessionLeads } = useLeadStore();
  const { toast } = useToast();

  const getFieldError = (field: string) => {
    return validationErrors.find(error => error.field === field)?.message;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check (bots will fill this hidden field)
    if (honeypot) return;

    const errors = validateLeadForm(formData);
    setValidationErrors(errors);
    if (errors.length > 0) return;


    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        industry: formData.industry,
        redirect_to: `${window.location.origin}/lead-confirmed`,
      };

      const { data, error: submitError } = await supabase.functions.invoke('submit-lead', { body: payload });
      if (submitError) throw submitError;

      addLead({ name: payload.name, email: payload.email, submitted_at: new Date().toISOString() });
      setSubmitted(true);
      setFormData({ name: '', email: '', industry: '' });
      toast({ title: 'Almost there!', description: 'Check your email for a confirmation link.' });
    } catch (err: any) {
      console.error('Error submitting lead:', err);
      const message = err?.message || '';
      const isDuplicate = err?.status === 409 || /exist|already/i.test(message) || err?.code === 'LEAD_EXISTS';
      if (isDuplicate) {
        setShowExistsDialog(true);
      } else {
        toast({ title: 'Submission failed', description: message || 'Please try again', variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendExisting = async () => {
    try {
      setIsResending(true);
      const email = formData.email.trim().toLowerCase();
      if (!email) return;
      const { error } = await supabase.functions.invoke('resend-lead-confirmation', {
        body: { email, redirect_to: `${window.location.origin}/lead-confirmed` },
      });
      if (error) throw error;
      toast({ title: 'Email resent', description: `We sent a new confirmation link to ${email}.` });
      setShowExistsDialog(false);
    } catch (err: any) {
      toast({ title: 'Failed to resend', description: err?.message || 'Try again later', variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors.some(error => error.field === field)) {
      setValidationErrors(prev => prev.filter(error => error.field !== field));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gradient-card p-8 rounded-2xl shadow-card border border-border backdrop-blur-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Mail className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Join Our Community</h2>
          <p className="text-muted-foreground">Be the first to know when we launch</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                pattern="^[\p{L}\p{N}\s'\-\.]{2,80}$"
                className={`pl-10 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground transition-smooth
                  ${getFieldError('name') ? 'border-destructive' : 'focus:border-accent focus:shadow-glow'}
                `}
              />
            </div>
            {getFieldError('name') && (
              <p className="text-destructive text-sm animate-fade-in">{getFieldError('name')}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                className={`pl-10 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground transition-smooth
                  ${getFieldError('email') ? 'border-destructive' : 'focus:border-accent focus:shadow-glow'}
                `}
              />
            </div>
            {getFieldError('email') && (
              <p className="text-destructive text-sm animate-fade-in">{getFieldError('email')}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
              <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                <SelectTrigger className={`pl-10 h-12 bg-input border-border text-foreground transition-smooth
                  ${getFieldError('industry') ? 'border-destructive' : 'focus:border-accent focus:shadow-glow'}
                `}>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="retail">Retail & E-commerce</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {getFieldError('industry') && (
              <p className="text-destructive text-sm animate-fade-in">{getFieldError('industry')}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-primary text-primary-foreground font-semibold rounded-lg shadow-glow hover:shadow-[0_0_60px_hsl(210_100%_60%/0.3)] transition-smooth transform hover:scale-[1.02]"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Get Early Access
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          By submitting, you agree to receive updates. Unsubscribe anytime.
        </p>
      </div>

      <Dialog open={showExistsDialog} onOpenChange={setShowExistsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead already exists for this email</DialogTitle>
            <DialogDescription>
              A lead has already been generated for {formData.email?.toLowerCase()}. Would you like us to resend the confirmation link?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExistsDialog(false)}>Close</Button>
            <Button onClick={handleResendExisting} disabled={isResending}>
              {isResending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {isResending ? 'Resending...' : 'Resend Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
