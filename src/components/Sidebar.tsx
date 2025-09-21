import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  User2,
  Edit3,
  BookOpen,
  Library,
  FileText,
  Settings,
  Sun,
  Moon,
  Megaphone
} from "lucide-react";
import { FaXTwitter, FaLinkedinIn, FaGithub, FaTelegram } from 'react-icons/fa6';
import { SiGitbook } from 'react-icons/si';
import { useTheme } from "@/context/ThemeContext";
import { TagSearch } from "@/components/TagSearch";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagSearchLoading, setIsTagSearchLoading] = useState(false);

  const handleTagSearch = (tags: string[]) => {
    setSelectedTags(tags);
    // You can add additional logic here to communicate with parent components
    // For now, we'll just update the local state
  };

  const navigationItems = [
    {
      name: "Home",
      href: "/app",
      icon: Home,
      current: location.pathname === "/app"
    },
    {
      name: "Library",
      href: "/app/library",
      icon: Library,
      current: location.pathname === "/app/library"
    },
    {
      name: "My Posts",
      href: "/app/my-posts",
      icon: User2,
      current: location.pathname === "/app/my-posts"
    },
    {
      name: "Drafts",
      href: "/app/drafts",
      icon: FileText,
      current: location.pathname === "/app/drafts"
    },
    {
      name: "Write",
      href: "/app/editor",
      icon: Edit3,
      current: location.pathname === "/app/editor" || location.pathname.startsWith("/app/editor/")
    },
    {
      name: "Announcements",
      href: "/app/announcements",
      icon: Megaphone,
      current: location.pathname === "/app/announcements"
    },
  ];

  const socialLinks = [
    {
      icon: <SiGitbook className="h-4 w-4" />,
      text: "Docs",
      href: "https://decentralizedx.gitbook.io/dx",
      label: "Documentation"
    },
    {
      icon: <FaTelegram className="h-4 w-4" />,
      text: "Telegram",
      href: "https://t.me/decentralizedX0",
      label: "Telegram Community"
    },
    {
      icon: <FaGithub className="h-4 w-4" />,
      text: "GitHub",
      href: "https://github.com/0xAakibAlam",
      label: "GitHub Repository"
    },
    {
      icon: <FaXTwitter className="h-4 w-4" />,
      text: "Twitter",
      href: "https://x.com/0xAakibAlam",
      label: "X (Twitter) Profile"
    },
    {
      icon: <FaLinkedinIn className="h-4 w-4" />,
      text: "LinkedIn",
      href: "https://www.linkedin.com/in/0xaakibalam/",
      label: "LinkedIn Profile"
    },
  ];

  return (
    <>
      {/* Overlay for mobile/tablet */}
      {isOpen && (
        <div 
          className="fixed left-0 top-[calc(4rem+1px)] right-0 bottom-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
            <div className={cn(
              "h-[calc(100vh-4rem)] w-56 sm:w-60 lg:w-64 bg-background border-r border-gray-100 dark:border-gray-900 transform transition-transform duration-300 ease-in-out flex flex-col overflow-hidden fixed left-0 z-50",
              isOpen ? "translate-x-0 top-[calc(4rem+1px)]" : "-translate-x-full top-16"
            )}>
              {/* Top border line */}
              <div className="w-full h-px bg-gray-100 dark:bg-gray-900"></div>
        {/* Header - Empty space for alignment */}
        <div className="p-4 flex-shrink-0">
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} to={item.href}>
                     <Button
                       variant="ghost"
                       className={cn(
                         "w-full justify-start gap-3 h-10",
                         item.current
                           ? "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-medium"
                           : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-200"
                       )}
                     >
                       <Icon className={cn(
                         "h-5 w-5",
                         item.current ? "fill-current" : ""
                       )} />
                       <span>{item.name}</span>
                     </Button>
              </Link>
            );
          })}
        </nav>

        {/* Tag Filter Section */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-900 flex-shrink-0">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Filter by Tags
          </div>
          <TagSearch
            onTagSearch={handleTagSearch}
            isLoading={isTagSearchLoading}
            placeholder="Add tags..."
            className="w-full"
            showAddButton={false}
          />
        </div>

        {/* Theme Toggle */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-900 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className="w-full justify-start gap-3 h-10"
          >
            {theme === "light" ? (
              <>
                <Moon className="h-5 w-5" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="h-5 w-5" />
                <span>Light Mode</span>
              </>
            )}
          </Button>
        </div>

        {/* Footer Section */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-900 flex-shrink-0">
          {/* Copyright */}
          {/* <div 
            className="text-xs mb-4"
            style={{ color: theme === "light" ? "#6B7280" : "#9CA3AF" }}
          >
            Copyright © 2025 dX. All rights reserved.
          </div> */}
          
          {/* Social Links */}
          <div className="flex items-center justify-between w-full">
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center text-xs hover:opacity-80 transition-opacity flex-1"
                style={{ color: theme === "light" ? "#6B7280" : "#9CA3AF" }}
                aria-label={link.label}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

      </div>
    </>
  );
};

export default Sidebar;
