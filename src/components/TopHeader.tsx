import { Button } from "@/components/ui/button";
import { CustomConnectButton } from './ConnectButton';
import PublishOverlay from './PublishOverlay';
import { Save } from "lucide-react";
import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useEditor } from "@/context/EditorContext";
import { PublishData } from './PublishOverlay';

interface TopHeaderProps {
  onMenuClick: () => void;
  onSave?: () => void;
  onPublish?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  isAuthenticated?: boolean;
}

const TopHeader = ({ onMenuClick }: TopHeaderProps) => {
  const { theme } = useTheme();
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on the editor page
  const isEditorPage = location.pathname.startsWith('/app/editor');
  
  // Get editor context
  const editorContext = useEditor();
  const { onSave, onPublish, onPublishWithData, isSaving, isPublishing, isAuthenticated: editorIsAuthenticated, hasUnsavedChanges, isEmpty, showPublishOverlay, setShowPublishOverlay } = editorContext;
  
  // Determine user state - use useMemo to make it reactive
  const userState = useMemo(() => {
    if (!isConnected) return 'disconnected';
    if (isConnected && !isAuthenticated) return 'connected';
    if (isConnected && isAuthenticated) return 'authenticated';
    return 'disconnected';
  }, [isConnected, isAuthenticated]);

  // Handle publish with data from overlay
  const handlePublishWithData = (publishData: PublishData) => {
    if (onPublishWithData) {
      onPublishWithData(publishData);
    } else {
      console.error('❌ onPublishWithData is not available');
    }
  };

  // Handle publish button click - show overlay instead of direct publish
  const handlePublishClick = () => {
    setShowPublishOverlay(true);
  };
  return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-gray-100 dark:border-gray-900">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Hamburger menu and Logo */}
        <div className="flex items-center gap-2 sm:gap-5">
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
          
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
            <img 
              src={theme === "light" ? "/InkDAO_Dark_Circle.png" : "/InkDAO_Light_Circle.png"} 
              alt="InkDAO" 
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain" 
            />
            <span className="text-xl sm:text-2xl font-bold">InkDAO</span>
          </div>
        </div>

        {/* Right side - Connect wallet */}
        <div className="flex items-center gap-3 sm:gap-2">
          {/* Action Buttons */}
          <div className="flex-shrink-0">
            <div className="flex items-center">
              {/* Save and Publish buttons (only on editor page) */}
              {isEditorPage && onSave && onPublish && (
                <>
                  {/* Save Button */}
                  <button
                    onClick={onSave}
                    disabled={!hasUnsavedChanges || isSaving || isPublishing || !address}
                    className="group relative px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 mr-1.5"
                    title={!editorIsAuthenticated ? "Authentication required to save" : !hasUnsavedChanges ? "No unsaved changes to save" : "Save content to IPFS (Ctrl/Cmd+S)"}
                  >
                    <div className="flex items-center space-x-2">
                      {isSaving && !isPublishing ? (
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
                    onClick={handlePublishClick}
                    disabled={hasUnsavedChanges || isSaving || !address || isEmpty}
                    className="group relative px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 mr-2"
                    title={!editorIsAuthenticated ? "Authentication required to publish" : hasUnsavedChanges ? "Save changes before publishing" : isEmpty ? "Add content to publish" : "Publish content to blockchain"}
                  >
                    <div className="flex items-center space-x-2">
                      {isPublishing ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span className="text-sm">Publishing to blockchain...</span>
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
                  <div className="h-6 w-px bg-gray-100 dark:bg-gray-900 mr-2"></div>
                </>
              )}

              {/* Connect wallet */}
              <div className="relative">
                <CustomConnectButton isEditorPage={false} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Overlay */}
      <PublishOverlay
        isOpen={showPublishOverlay}
        onClose={() => setShowPublishOverlay(false)}
        onPublish={handlePublishWithData}
        isPublishing={isPublishing}
      />
    </header>
  );
};

export default TopHeader;
