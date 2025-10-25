import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import { Wallet, ShieldCheck, ExternalLink, Loader2, Zap } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AuthGuard = ({ children, fallback }: AuthGuardProps) => {
  const { isConnected } = useAccount();
  const { isAuthenticated, isAuthenticating } = useAuth();

  // If wallet not connected, show connect prompt
  if (!isConnected) {
    return fallback || (
      <div className="w-full overflow-x-hidden">
        {/* Unified Info Card */}
        <div className="px-4 sm:px-8 py-8 lg:px-12 xl:px-20 max-w-6xl mx-auto w-full min-h-[calc(100vh-4rem)] flex items-center">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-red-950/20 p-8 sm:p-10 md:p-14 lg:p-16 border border-border/50 shadow-2xl w-full">
            <div className="relative z-10 text-center">
              {/* Header with Icon and Title */}
              <div className="flex flex-row items-center justify-center gap-3 sm:gap-6 mb-8">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-2xl flex-shrink-0">
                  <Wallet className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground text-left">
                  Connect Your Wallet to Continue
                </h1>
              </div>

              {/* Description */}
              <div className="mb-10">
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
                  Authentication happens automatically when you connect your wallet using EIP-4361 (Sign-In with Ethereum) standard
                </p>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 text-left">
                <div className="flex items-start gap-4 p-6 rounded-xl bg-background/50 border border-border/30">
                  <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-base sm:text-lg font-semibold text-foreground mb-2">Supported Wallets</p>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      MetaMask, WalletConnect, Coinbase Wallet, Rainbow, and more
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-6 rounded-xl bg-background/50 border border-border/30">
                  <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-base sm:text-lg font-semibold text-foreground mb-2">One-Step Authentication</p>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      Connect and sign in one seamless step - no separate authentication required
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-6 rounded-xl bg-background/50 border border-border/30">
                  <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-base sm:text-lg font-semibold text-foreground mb-2">No Gas Fees</p>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      Sign-in is free and doesn't require any blockchain transaction fees
                    </p>
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <div className="text-center space-y-3">
                <p className="text-base sm:text-lg text-muted-foreground">
                  New to Web3 or don't have a wallet yet?
                </p>
                <a 
                  href="https://decentralizedx.gitbook.io/dx/tutorials/getting-started" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-base sm:text-lg font-medium text-primary hover:underline"
                >
                  Learn how to set up your wallet
                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If wallet is connected but authentication is in progress, show loading state
  // Also show this state if connected but not authenticated (means auth is about to start)
  if (isConnected && (isAuthenticating || !isAuthenticated)) {
    return fallback || (
      <div className="w-full overflow-x-hidden">
        {/* Authentication in Progress */}
        <div className="px-4 sm:px-8 py-8 lg:px-12 xl:px-20 max-w-6xl mx-auto w-full min-h-[calc(100vh-4rem)] flex items-center">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 p-8 sm:p-10 md:p-14 lg:p-16 border border-border/50 shadow-2xl w-full">
            <div className="relative z-10 text-center">
              {/* Loading Icon */}
              <div className="mb-8">
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl">
                  <Loader2 className="h-12 w-12 sm:h-14 sm:w-14 text-white animate-spin" />
                </div>
              </div>

              {/* Main Content */}
              <div className="space-y-5 mb-10">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                  Authenticating Your Wallet
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
                  Please sign the message in your wallet to complete authentication
                </p>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 text-left">
                <div className="flex items-start gap-4 p-6 rounded-xl bg-background/50 border border-border/30">
                  <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-base sm:text-lg font-semibold text-foreground mb-2">No Gas Fees</p>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      Signing is free and doesn't require any transaction fees
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-6 rounded-xl bg-background/50 border border-border/30">
                  <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-base sm:text-lg font-semibold text-foreground mb-2">Secure Authentication</p>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      EIP-4361 standard ensures your wallet's security
                    </p>
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <div className="text-center">
                <p className="text-base sm:text-lg text-muted-foreground">
                  Check your wallet extension or app for the signature request
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If wallet is connected and authenticated, render protected content
  return <>{children}</>;
};