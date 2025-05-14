
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import LoginForm from '@/components/LoginForm';
import { Link } from 'react-router-dom';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex flex-col lg:flex-row min-h-screen">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col justify-center p-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Shop Guard</h1>
          <p className="text-xl md:text-2xl mb-8 text-muted-foreground">
            Secure your shop with advanced motion detection
          </p>
          <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex">
            <Link to="/register">
              <Button size="lg" className="w-full md:w-auto">
                Register Now
              </Button>
            </Link>
            <a href="#login">
              <Button size="lg" variant="outline" className="w-full md:w-auto">
                Login
              </Button>
            </a>
          </div>
          
          <div className="mt-12 space-y-6">
            <div className="flex items-start">
              <div className="bg-primary/20 p-2 rounded-full mr-4">
                <div className="w-6 h-6 flex items-center justify-center text-primary">
                  📹
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Motion Detection</h3>
                <p className="text-muted-foreground">
                  Automatically detect and record any movement in your shop during closed hours.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary/20 p-2 rounded-full mr-4">
                <div className="w-6 h-6 flex items-center justify-center text-primary">
                  🔔
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Instant Alerts</h3>
                <p className="text-muted-foreground">
                  Receive immediate alarm notifications when unexpected activity is detected.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary/20 p-2 rounded-full mr-4">
                <div className="w-6 h-6 flex items-center justify-center text-primary">
                  📱
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Easy Response</h3>
                <p className="text-muted-foreground">
                  Quickly respond to alerts and temporarily disable monitoring when you're at the shop.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Login Section */}
        <div id="login" className="flex-1 flex items-center justify-center p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Index;
