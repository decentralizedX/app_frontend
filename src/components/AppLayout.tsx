import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { SearchProvider } from "@/context/SearchContext";
import { EditorProvider } from "@/context/EditorContext";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Show sidebar only for app routes (routes that start with /app)
  const showSidebar = location.pathname.startsWith('/app');

  // Set sidebar to open by default on large screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Check on mount
    checkScreenSize();

    // Listen for resize events
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <ThemeProvider>
      <SearchProvider>
        <EditorProvider>
          <div className={`h-screen max-h-screen bg-background flex flex-col`}>
          {/* Top Header - only show for app routes */}
          {showSidebar && (
            <TopHeader 
              onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            />
          )}
          
          
          {/* Main content area with sidebar and content */}
          <div className={`flex-1 flex transition-all duration-300 ease-in-out ${showSidebar ? 'pt-16' : ''} min-h-0 max-h-full`}>
            {/* Sidebar - only show for app routes */}
            {showSidebar && (
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            )}
            
            {/* Main content area - natural flex layout */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${showSidebar && sidebarOpen ? 'lg:ml-64' : ''} min-h-0 max-h-full`}>
              {/* Main content - scrollable only when needed */}
              <main className={`flex-1 w-full bg-background overflow-y-auto min-h-0 max-h-full`}>
                {children}
              </main>
            </div>
          </div>
          </div>
        </EditorProvider>
      </SearchProvider>
    </ThemeProvider>
  );
};

export default AppLayout;



