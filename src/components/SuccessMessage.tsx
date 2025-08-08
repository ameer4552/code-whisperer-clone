import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeadStore } from '@/lib/lead-store';

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
          Welcome aboard! 🎉
        </h2>
        
        <p className="text-muted-foreground mb-2">
          Thanks for joining! We'll be in touch soon with updates.
        </p>
        
        <p className="text-sm text-accent mb-8">
          You're #{sessionLeads.length} in this session
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
            <p className="text-sm text-foreground">
              💡 <strong>What's next?</strong><br />
              We'll send you exclusive updates, early access, and behind-the-scenes content as we build something amazing.
            </p>
          </div>

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