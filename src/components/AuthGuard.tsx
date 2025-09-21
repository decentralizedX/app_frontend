import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Wallet, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const { isConnected } = useAccount();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const navigate = useNavigate();

  // If not connected to wallet
  if (!isConnected) {
    return fallback || (
      <div className="min-h-screen flex flex-col items-center justify-start text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500 px-4 pt-32">
        <div className="max-w-2xl mx-auto">
          {/* Large Icon Container */}
          <div className="mb-8 animate-in fade-in-50 zoom-in-50 duration-700">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
              <Wallet className="h-12 w-12 text-white animate-[float_3s_ease-in-out_infinite]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              Please connect your wallet to access this page and start your decentralized journey
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
            <Button 
              onClick={() => navigate('/app')} 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto px-8 py-3 text-lg font-semibold"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If connected but not authenticated
  if (!isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex flex-col items-center justify-start text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500 px-4 pt-32">
        <div className="max-w-2xl mx-auto">
          {/* Large Icon Container */}
          <div className="mb-8 animate-in fade-in-50 zoom-in-50 duration-700">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-2xl">
              <User className="h-12 w-12 text-white animate-[float_3s_ease-in-out_infinite]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Authentication Required
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              Please sign in with your wallet to access this page
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
            <Button 
              onClick={() => navigate('/app')} 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto px-8 py-3 text-lg font-semibold"
            >
              Go to Home
            </Button>
            <Button 
              onClick={authenticate}
              disabled={isAuthenticating}
              variant="default" 
              size="lg"
              className="w-full sm:w-auto px-8 py-3 text-lg font-semibold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, render children
  return <>{children}</>;
};