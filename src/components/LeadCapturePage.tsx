import { LeadCaptureForm } from './LeadCaptureForm';
import { SuccessMessage } from './SuccessMessage';
import { useLeadStore } from '@/lib/lead-store';
import { Rocket, Star, Users } from 'lucide-react';

export const LeadCapturePage = () => {
  const { submitted } = useLeadStore();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background GIF */}
      <div className="absolute inset-0">
        <img
          src="https://fwjfenbkcgfgkaijgtsi.supabase.co/storage/v1/object/public/gif//noartistjustwatching_crazy_dynamic_camera_movements_with_high_e0c4efb9-94aa-43c8-9c61-04b82bfe6405_0.gif"
          alt="Background animation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/80"></div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 max-w-3xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Rocket className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">StartupName</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            The Future of
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Innovation</span>
            <br />
            Starts Here
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Join thousands of forward-thinking individuals who are shaping the next big thing. 
            Be part of something extraordinary.
          </p>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mb-12">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>10,000+ early adopters</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-current text-accent" />
              <span>Backed by top VCs</span>
            </div>
          </div>
        </div>

        {/* Form or Success Message */}
        {submitted ? <SuccessMessage /> : <LeadCaptureForm />}

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>Trusted by innovators worldwide • No spam, ever • Unsubscribe anytime</p>
        </div>
      </div>
    </div>
  );
};