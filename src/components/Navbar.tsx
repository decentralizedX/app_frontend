import { Link, useLocation } from "react-router-dom";
import { CustomConnectButton } from './ConnectButton';
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Edit3, User2, Home } from "lucide-react";

const Navbar = () => {
  const location = useLocation();

  return (
    <nav>
      <div className="container px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xl font-bold flex items-center gap-2">
              <img 
                src="/dxLogo.png" 
                alt="dx" 
                className="h-16 w-16 object-contain" 
              /> 
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Home Button */}
            <Link to="/app">
              <Button
                variant={location.pathname === "/app" ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                <span className="hidden lg:inline">Home</span>
              </Button>
            </Link>
            
            {/* Write Button */}
            <Link to="/app/editor">
              <Button
                variant={location.pathname === "/app/editor" || location.pathname.startsWith("/app/editor/") ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                <span className="hidden lg:inline">Write</span>
              </Button>
            </Link>
            
            {/* Me Button */}
            <Link to="/app/my-posts">
              <Button
                variant={location.pathname === "/app/my-posts" ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-2"
              >
                <User2 className="h-4 w-4" strokeWidth={2.5} />
                <span className="hidden lg:inline">Me</span>
              </Button>
            </Link>
            <div className="flex-shrink-0">
              <CustomConnectButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
