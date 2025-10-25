import { useState, useEffect, useRef } from 'react';
import { useAccount, useSignMessage, useChainId, useDisconnect } from 'wagmi';
import { authService, type AuthState } from '@/services/authService';
import { SiweMessage } from 'siwe';

// Global flag to prevent multiple simultaneous authentication attempts across all hook instances
let globalAuthInProgress = false;
let globalHasAttempted = false;

export const useAuth = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
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
    
    // Listen for immediate auth state changes via custom event
    const handleAuthStateChange = () => {
      updateAuthState();
    };
    
    window.addEventListener('authStateChanged', handleAuthStateChange);
    
    // Also check periodically for other auth changes
    const interval = setInterval(updateAuthState, 5000); // Check every 5 seconds for other changes
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
      clearInterval(interval);
    };
  }, []);

  // Auto-authenticate when wallet connects (using global flags to prevent multiple attempts)
  useEffect(() => {
    const autoAuthenticate = async () => {
      // Prevent multiple simultaneous authentication attempts across ALL hook instances
      if (globalAuthInProgress) {
        console.log('⏸️ Authentication already in progress (global), skipping...');
        return;
      }

      if (globalHasAttempted) {
        console.log('⏸️ Authentication already attempted (global), skipping...');
        return;
      }

      // Only auto-authenticate if:
      // 1. Wallet is connected
      // 2. User is not already authenticated
      // 3. Not currently authenticating
      // 4. Address exists
      if (isConnected && address && !authState.isAuthenticated && !isAuthenticating) {
        console.log('🔄 Auto-authenticating after wallet connection...');
        globalHasAttempted = true; // Mark globally that we've attempted
        globalAuthInProgress = true; // Mark globally that authentication is in progress
        
        const success = await authenticate();
        
        globalAuthInProgress = false; // Mark globally that authentication is complete
        
        // If authentication failed (user rejected), disconnect the wallet
        if (!success) {
          console.log('❌ Authentication failed, disconnecting wallet...');
          disconnect();
          globalHasAttempted = false; // Reset globally for next connection
        }
      }
    };

    autoAuthenticate();
  }, [isConnected, address]); // Only trigger when wallet connects or address changes

  // Reset global auth flags when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      globalHasAttempted = false;
      globalAuthInProgress = false;
    }
  }, [isConnected]);

  // Logout when wallet disconnects
  useEffect(() => {
    if (!isConnected && authState.isAuthenticated) {
      authService.logout();
      setAuthState({
        isAuthenticated: false,
        token: null,
        address: null,
      });
    }
  }, [isConnected, authState.isAuthenticated]);

  // Monitor wallet address changes and logout if address changes
  useEffect(() => {
    if (isConnected && address && authState.isAuthenticated && authState.address) {
      // Check if the current wallet address is different from authenticated address
      if (address.toLowerCase() !== authState.address.toLowerCase()) {
        // Wallet address changed, force logout
        authService.logout();
        setAuthState({
          isAuthenticated: false,
          token: null,
          address: null,
        });
      }
    }
  }, [address, isConnected, authState.isAuthenticated, authState.address]);

  // Monitor token expiration and re-authenticate if wallet is still connected
  useEffect(() => {
    const checkTokenExpiration = async () => {
      // If wallet is connected but token expired/not authenticated, trigger re-authentication
      if (isConnected && address && !authState.isAuthenticated && !globalAuthInProgress && !isAuthenticating) {
        console.log('🔄 Token expired, re-authenticating...');
        globalAuthInProgress = true;
        
        const success = await authenticate();
        
        globalAuthInProgress = false;
        
        // If authentication failed (user rejected), disconnect the wallet
        if (!success) {
          console.log('❌ Re-authentication failed, disconnecting wallet...');
          disconnect();
        }
      }
    };

    checkTokenExpiration();
  }, [authState.isAuthenticated, isConnected, address, isAuthenticating]);

  // Manual authentication function
  const authenticate = async (isManual: boolean = false): Promise<boolean> => {
    if (!isConnected || !address) {
      return false;
    }

    if (authState.isAuthenticated) {
      return true;
    }

    // Check if wallet is accessible (not locked)
    try {
      // Try to get account info to check if wallet is accessible
    } catch (error) {
      return false;
    }

    try {
      setIsAuthenticating(true);
      
      // Get domain and origin from window
      const domain = window.location.host;
      const origin = window.location.origin;
      
      // Generate nonce (unique identifier for this session)
      const nonce = Math.random().toString(36).substring(2, 15);
      
      // Create SIWE message according to EIP-4361 standard
      const siweMessage = new SiweMessage({
        domain,
        address,
        statement: 'Sign in with Ethereum to DecentralizedX',
        uri: origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      
      // Generate the properly formatted message string
      const message = siweMessage.prepareMessage();
      
      // Request signature from wallet
      const signature = await signMessageAsync({ 
        message,
        account: address as `0x${string}`
      });
      
      if (!signature) {
        throw new Error('User cancelled signature or signature failed');
      }
            
      // Continue with the authentication process with SIWE message
      await authService.login(address, message, signature);
      
      // Small delay to ensure state is properly updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const newState = authService.getAuthState();
      setAuthState(newState);
      
      return true;
    } catch (error: any) {
      console.error('Authentication failed:', error);
      
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
  };

  // Check if current wallet address matches authenticated address
  const isCorrectWallet = () => {
    return isConnected && address && authState.address && 
           address.toLowerCase() === authState.address.toLowerCase();
  };

  return {
    // Auth state (simplified: connected = authenticated)
    isAuthenticated: authState.isAuthenticated,
    authToken: authState.token,
    authAddress: authState.address,
    isAuthenticating: isAuthenticating,
    
    // Wallet state
    walletAddress: address,
    isWalletConnected: isConnected,
    
    // Actions
    authenticate,
    logout,
  };
};
