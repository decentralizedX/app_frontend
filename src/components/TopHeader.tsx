import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomConnectButton } from './ConnectButton';
import { useSearch } from "@/context/SearchContext";
import { Search, X, Wallet, User, CheckCircle, Loader2, Save } from "lucide-react";
import { useState, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useEditor } from "@/context/EditorContext";

interface TopHeaderProps {
  onMenuClick: () => void;
  onSave?: () => void;
  onPublish?: () => void;
  isSaving?: boolean;
  isAuthenticated?: boolean;
}

const TopHeader = ({ onMenuClick }: TopHeaderProps) => {
  const { searchTerm, setSearchTerm } = useSearch();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const { isAuthenticated, authenticate, logout, isAuthenticating } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on the editor page
  const isEditorPage = location.pathname.startsWith('/app/editor');
  
  // Get editor context
  const editorContext = useEditor();
  const { onSave, onPublish, isSaving, isAuthenticated: editorIsAuthenticated } = editorContext;
  
  // Determine user state - use useMemo to make it reactive
  const userState = useMemo(() => {
    if (!isConnected) return 'disconnected';
    if (isConnected && !isAuthenticated) return 'connected';
    if (isConnected && isAuthenticated) return 'authenticated';
    return 'disconnected';
  }, [isConnected, isAuthenticated]);
  return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-gray-100 dark:border-gray-900">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Hamburger menu and Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="p-0"
          >
            <img
              src="/hamburger.png"
              alt="Menu" 
              className="h-8 w-8 object-contain" 
            />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold sm:hidden">dX</span>
            <span className="text-xl font-bold hidden sm:block">decentralizedX</span>
          </div>

          {/* Search box (hidden on small screens and editor page) */}
          {!isEditorPage && (
            <div className="hidden sm:flex max-w-lg ml-20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search posts by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-9 w-full rounded-xl border-0 focus-visible:ring-0 bg-gray-100 dark:bg-gray-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right side - Search icon for mobile and Connect wallet */}
        <div className="flex items-center gap-3 sm:gap-2">
          {/* Search icon for mobile (hidden on editor page) */}
          {!isEditorPage && (
            <div className="sm:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl p-0"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              >
                <img
                  src={theme === "light" ? "/search-dark.png" : "/search-light.png"}
                  alt="Search"
                  className="h-7 w-7 object-contain"
                />
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex-shrink-0">
            <div className="flex items-center">
              {/* Save and Publish buttons (only on editor page) */}
              {isEditorPage && onSave && onPublish && (
                <>
                  {/* Save Button */}
                  <button
                    onClick={onSave}
                    disabled={isSaving || !address}
                    className="group relative px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 mr-2"
                    title={!editorIsAuthenticated ? "Authentication required to save" : "Save content to IPFS (Ctrl/Cmd+S)"}
                  >
                    <div className="flex items-center space-x-2">
                      {isSaving ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span className="text-sm">Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span className="text-sm hidden sm:inline">Save</span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Publish Button */}
                  <button
                    onClick={onPublish}
                    disabled={isSaving || !address}
                    className="group relative px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 mr-3"
                    title={!editorIsAuthenticated ? "Authentication required to publish" : "Publish content to IPFS"}
                  >
                    <div className="flex items-center space-x-2">
                      {isSaving ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span className="text-sm">Publishing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span className="text-sm hidden sm:inline">Publish</span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Divider */}
                  <div className="h-6 w-px bg-gray-100 dark:bg-gray-900 mr-3"></div>
                </>
              )}

              {/* Connect wallet */}
              <div className="relative">
                <CustomConnectButton isEditorPage={isEditorPage} />
              </div>

              {/* Vertical separator and Sign In button (hidden on editor page) */}
              {!isEditorPage && (
                <>
                  {/* Vertical separator */}
                  <div className="h-8 w-px bg-gray-100 dark:bg-gray-900"></div>

                  {/* Sign In/Out Button */}
                  <button
                onClick={async () => {
                  if (userState === 'connected') {
                    await authenticate();
                  } else if (userState === 'authenticated') {
                    logout();
                  }
                }}
                disabled={userState === 'disconnected' || isAuthenticating}
                title={isAuthenticating ? "Please check your wallet and sign the message" : userState === 'authenticated' ? "Sign out of your account" : "Sign in with your wallet"}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border shadow-md transition-all duration-200 transform",
                  "rounded-l-none rounded-r-lg border-l-0",
                  userState === 'disconnected' || isAuthenticating
                    ? theme === "dark"
                      ? "bg-white text-black cursor-not-allowed opacity-80"
                      : "bg-black text-white cursor-not-allowed opacity-80"
                    : theme === "dark"
                      ? "bg-white text-black border-gray-300 hover:bg-gray-100"
                      : "bg-black text-white border-gray-800 hover:bg-gray-900",
                  "hover:scale-105 focus:outline-none disabled:hover:scale-100"
                )}
              >
                {isAuthenticating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : userState === 'authenticated' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="hidden lg:inline">
                  {isAuthenticating ? 'Waiting for wallet...' : userState === 'authenticated' ? 'Sign Out' : 'Sign In'}
                </span>
              </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Dropdown (hidden on editor page) */}
      {!isEditorPage && isMobileSearchOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-background border-b border-gray-100 dark:border-gray-900 px-4 py-3 z-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-9 w-full rounded-xl border-0 focus-visible:ring-0 bg-gray-100 dark:bg-gray-900"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default TopHeader;
