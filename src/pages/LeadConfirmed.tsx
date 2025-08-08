import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const LeadConfirmed = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="w-full max-w-md text-center bg-gradient-card p-8 rounded-2xl shadow-card border border-border">
        <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-glow mb-4">
          <CheckCircle className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Aboard! 🎉</h1>
        <p className="text-muted-foreground">Your email is confirmed. Thanks for joining the journey.</p>
      </section>
    </main>
  );
};

export default LeadConfirmed;
