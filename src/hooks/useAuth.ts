import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { authService, type AuthState } from '@/services/authService';
import { toast } from 'sonner';

export const useAuth = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    address: null,
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Update auth state when component mounts or auth changes
  useEffect(() => {
    const updateAuthState = () => {
      const newState = authService.getAuthState();
      setAuthState(newState);
    };

    updateAuthState();
    
    // Listen for auth changes (you could implement an event system)
    const interval = setInterval(updateAuthState, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Debug effect to monitor authentication state changes
  useEffect(() => {
    console.log('🔍 Auth state changed:', {
      isAuthenticated: authState.isAuthenticated,
      isAuthenticating,
      isSigning,
      address: authState.address,
      walletAddress: address
    });
  }, [authState.isAuthenticated, isAuthenticating, isSigning, authState.address, address]);

  // Auto-authentication removed - users must manually authenticate

  // Logout when wallet disconnects
  useEffect(() => {
    if (!isConnected && authState.isAuthenticated) {
      console.log('🔌 Wallet disconnected, logging out...');
      authService.logout();
      setAuthState({
        isAuthenticated: false,
        token: null,
        address: null,
      });
      
      toast.info("You have been logged out due to wallet disconnection.", {
        description: "Logged Out"
      });
    }
  }, [isConnected, authState.isAuthenticated]);

  // Manual authentication function
  const authenticate = async (): Promise<boolean> => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first.", {
        description: "Wallet Required"
      });
      return false;
    }

    if (authState.isAuthenticated) {
      console.log('Already authenticated');
      return true;
    }

    // Check if wallet is accessible (not locked)
    try {
      // Try to get account info to check if wallet is accessible
      console.log('🔍 Checking wallet accessibility...');
    } catch (error) {
      toast.error("Your MetaMask wallet appears to be locked. Please unlock it and try again.", {
        description: "Wallet Not Accessible",
        duration: 6000,
      });
      return false;
    }

    try {
      setIsAuthenticating(true);
      
      // Generate salt (current timestamp in seconds)
      const timestamp = Math.floor(Date.now() / 1000);
      const salt = `I want to authenticate for read operations at timestamp - ${timestamp}`;
      
      console.log('🔐 Starting authentication process...');
      console.log('1. Generated salt:', salt);
      console.log('2. User address:', address);
      
      // Sign the message and wait for user confirmation
      console.log('3. Requesting signature from user...');
      
       // Create a timeout promise to handle locked/unresponsive wallets
       const timeoutPromise = new Promise<never>((_, reject) => {
         setTimeout(() => {
           reject(new Error('Wallet is locked or unresponsive. Please unlock your wallet and try again.'));
         }, 15000); // 15 second timeout
       });
      
      // Race between signature and timeout
      const signature = await Promise.race([
        signMessageAsync({ 
          message: salt,
          account: address as `0x${string}`
        }),
        timeoutPromise
      ]);
      
      if (!signature) {
        throw new Error('User cancelled signature or signature failed');
      }
      
      console.log('4. Signature received:', signature);
      
      // Continue with the authentication process
      await authService.login(address, salt, signature);
      
      // Small delay to ensure state is properly updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const newState = authService.getAuthState();
      setAuthState(newState);
      
      toast.success("You are now logged in with your wallet.", {
        description: "Authentication Successful"
      });
      
      return true;
    } catch (error: any) {
      console.error('Authentication failed:', error);
      
      // Provide more specific error messages and toast notifications
      let errorMessage = "Failed to authenticate with wallet.";
      let toastTitle = "Authentication Failed";
      let toastDuration = 5000;
      
      if (error.message) {
        if (error.message.includes('locked') || error.message.includes('unresponsive')) {
          errorMessage = "Wallet is locked or unresponsive. Please unlock your wallet and try again.";
          toastTitle = "Wallet Locked";
          toastDuration = 8000; // Show longer for wallet errors
        } else if (error.message.includes('cancelled') || error.message.includes('rejected')) {
          errorMessage = "Signature request was cancelled or rejected. Please try again.";
          toastTitle = "Signature Cancelled";
        } else if (error.message.includes('User rejected')) {
          errorMessage = "You rejected the signature request. Please try again.";
          toastTitle = "Signature Rejected";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. Please check your wallet and try again.";
          toastTitle = "Request Timeout";
          toastDuration = 6000;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, {
        description: toastTitle,
        duration: toastDuration,
      });
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Manual logout function
  const logout = () => {
    authService.logout();
    setAuthState({
      isAuthenticated: false,
      token: null,
      address: null,
    });
    
    toast.info("You have been successfully logged out.", {
      description: "Logged Out"
    });
  };

  // Check if current wallet address matches authenticated address
  const isCorrectWallet = () => {
    return isConnected && address && authState.address && 
           address.toLowerCase() === authState.address.toLowerCase();
  };

  return {
    // Auth state
    isAuthenticated: authState.isAuthenticated,
    authToken: authState.token,
    authAddress: authState.address,
    isAuthenticating: isAuthenticating, // Only use our own state, not wagmi's isSigning
    
    // Wallet state
    walletAddress: address,
    isWalletConnected: isConnected,
    isCorrectWallet: isCorrectWallet(),
    
    // Actions
    authenticate,
    logout,
    
    // Helper to ensure authentication before API calls
    ensureAuthenticated: async (): Promise<boolean> => {
      if (authState.isAuthenticated && isCorrectWallet()) {
        return true;
      }
      return await authenticate();
    }
  };
};
